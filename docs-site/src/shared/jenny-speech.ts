const audioCache = new Map<string, Blob>();

/** Retrieves Jenny neural speech for vocabulary playback. */
export class JennySpeechClient {
  /** @returns Whether local Jenny synthesis is available. */
  public get available(): boolean {
    return import.meta.env.DEV;
  }

  /**
   * Synthesizes text with en-US-JennyNeural and caches it for this browser session.
   * @param text English text to synthesize.
   * @returns Jenny MP3 audio.
   */
  public async synthesize(text: string): Promise<Blob> {
    if (!this.available) throw new Error("Jenny speech is only available locally.");
    const normalized = text.trim();
    const cached = audioCache.get(normalized);
    if (cached) return cached;

    const audio = await this.fetchLocal(normalized);
    audioCache.set(normalized, audio);
    return audio;
  }

  private async fetchLocal(text: string): Promise<Blob> {
    const response = await fetch(`${import.meta.env.BASE_URL}api/word-audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error("Jenny speech is unavailable.");
    return response.blob();
  }

}
