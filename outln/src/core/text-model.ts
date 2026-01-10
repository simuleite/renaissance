/**
 * Minimal text model implementation
 * Simplified version of VSCode's ITextModel
 */

/**
 * Minimal text model for source code
 */
export class TextModel {
  private _versionId: number = 1;

  constructor(
    public readonly uri: string,
    public readonly content: string,
    public readonly languageId: string
  ) {}

  /**
   * Get version ID for cache invalidation
   * MVP version always returns 1
   */
  getVersionId(): number {
    return this._versionId;
  }

  /**
   * Get line count
   */
  getLineCount(): number {
    return this.content.split('\n').length;
  }

  /**
   * Get line content
   */
  getLine(lineNumber: number): string {
    const lines = this.content.split('\n');
    return lines[lineNumber] || '';
  }
}
