import { Response } from "express";

export class StreamService {
  static initSSE(res: Response): void {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
  }

  static emit(res: Response, event: string, data: any): void {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  static emitToken(res: Response, token: string): void {
    this.emit(res, "token", { token });
  }

  static emitToolCall(res: Response, toolName: string, args: any): void {
    this.emit(res, "tool_call", { name: toolName, args });
  }

  static emitEnd(res: Response): void {
    this.emit(res, "done", {});
    res.end();
  }

  static emitError(res: Response, error: string): void {
    this.emit(res, "error", { error });
    res.end();
  }
}