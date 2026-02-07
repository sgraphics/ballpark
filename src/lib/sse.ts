const connections = new Map<string, Set<ReadableStreamDefaultController>>();

export function addConnection(negotiationId: string, controller: ReadableStreamDefaultController) {
  if (!connections.has(negotiationId)) {
    connections.set(negotiationId, new Set());
  }
  connections.get(negotiationId)!.add(controller);
}

export function removeConnection(negotiationId: string, controller: ReadableStreamDefaultController) {
  connections.get(negotiationId)?.delete(controller);
}

export function pushUpdate(negotiationId: string, data: unknown) {
  const controllers = connections.get(negotiationId);
  if (controllers) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    controllers.forEach((controller) => {
      try {
        controller.enqueue(encoder.encode(message));
      } catch {
        controllers.delete(controller);
      }
    });
  }
}
