import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { MarkdownValidator } from "./src/shared/markdown-validator.ts";

const siteDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(siteDirectory, "..");
const virtualModuleId = "virtual:analysis-documents";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "docs-site",
  "site-packages",
]);

interface AnalysisDocument {
  path: string;
  title: string;
  section: string;
  content: string;
  revision: string;
}

class MarkdownDocumentRepository {
  public load(): AnalysisDocument[] {
    return this.collectFiles(repositoryDirectory)
      .sort()
      .map((filePath) => this.readDocument(filePath));
  }

  public save(relativePath: string, content: string): AnalysisDocument {
    if (!this.load().some((document) => document.path === relativePath)) {
      throw new Error("Document path is not editable.");
    }

    const filePath = path.resolve(repositoryDirectory, relativePath);
    const relativeToRepository = path.relative(repositoryDirectory, filePath);
    if (
      relativeToRepository.startsWith("..") ||
      path.isAbsolute(relativeToRepository)
    ) {
      throw new Error("Document path is outside the repository.");
    }

    const temporaryPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, filePath);
    return this.readDocument(filePath);
  }

  public find(relativePath: string): AnalysisDocument | undefined {
    return this.load().find((document) => document.path === relativePath);
  }

  private collectFiles(directory: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) continue;
        files.push(...this.collectFiles(entryPath));
      } else if (entry.name.endsWith(".md")) {
        files.push(entryPath);
      }
    }
    return files;
  }

  private readDocument(filePath: string): AnalysisDocument {
    const content = fs.readFileSync(filePath, "utf8");
    const relativePath = path
      .relative(repositoryDirectory, filePath)
      .split(path.sep)
      .join("/");
    const segments = relativePath.split("/");
    return {
      path: relativePath,
      title:
        content.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(filePath, ".md"),
      section: segments.length > 1 ? segments[0] : "Root",
      content,
      revision: crypto.createHash("sha256").update(content).digest("hex"),
    };
  }
}

class MarkdownDocumentsPlugin {
  private readonly repository = new MarkdownDocumentRepository();
  private readonly validator = new MarkdownValidator();
  private readonly internalWrites = new Set<string>();

  public create(): Plugin {
    return {
      name: "analysis-markdown-documents",
      resolveId(id) {
        return id === virtualModuleId ? resolvedVirtualModuleId : undefined;
      },
      load: (id) => {
        if (id !== resolvedVirtualModuleId) return undefined;
        return `export default ${JSON.stringify(this.repository.load())};`;
      },
      configureServer: (server) => {
        server.middlewares.use("/api/documents", (request, response, next) => {
          if (request.method !== "PUT") return next();

          let body = "";
          request.setEncoding("utf8");
          request.on("data", (chunk) => {
            body += chunk;
            if (body.length > 2_100_000) request.destroy();
          });
          request.on("end", () => {
            response.setHeader("Content-Type", "application/json");
            try {
              const payload = JSON.parse(body) as {
                path?: string;
                content?: string;
                expectedRevision?: string;
              };
              if (
                typeof payload.path !== "string" ||
                typeof payload.content !== "string" ||
                typeof payload.expectedRevision !== "string"
              ) {
                response.statusCode = 400;
                response.end(
                  JSON.stringify({
                    errors: [
                      "Path, content, and expected revision are required.",
                    ],
                  }),
                );
                return;
              }

              const currentDocument = this.repository.find(payload.path);
              if (!currentDocument)
                throw new Error("Document path is not editable.");
              if (currentDocument.revision !== payload.expectedRevision) {
                response.statusCode = 409;
                response.end(
                  JSON.stringify({
                    errors: [
                      "This file changed on disk after you opened it. Reload before saving to avoid overwriting those changes.",
                    ],
                  }),
                );
                return;
              }

              const validation = this.validator.validate(payload.content);
              if (!validation.valid) {
                response.statusCode = 422;
                response.end(JSON.stringify(validation));
                return;
              }

              this.internalWrites.add(
                path.resolve(repositoryDirectory, payload.path),
              );
              const document = this.repository.save(
                payload.path,
                payload.content,
              );
              response.end(JSON.stringify({ valid: true, document }));
            } catch (error) {
              response.statusCode = 400;
              response.end(
                JSON.stringify({
                  errors: [
                    error instanceof Error ? error.message : "Save failed.",
                  ],
                }),
              );
            }
          });
        });

        server.watcher.on("change", (changedPath) => {
          if (!changedPath.endsWith(".md")) return;
          const module = server.moduleGraph.getModuleById(
            resolvedVirtualModuleId,
          );
          if (module) server.moduleGraph.invalidateModule(module);
          if (this.internalWrites.delete(changedPath)) return;
          server.ws.send({ type: "full-reload" });
        });
      },
    };
  }
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react(), new MarkdownDocumentsPlugin().create()],
  server: {
    host: "127.0.0.1",
    port: 4174,
  },
});
