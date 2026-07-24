const PHYSICAL_SENSOR_NODE_PATTERN = /^(?:master|sat-\d+)$/;

export function physicalSensorNodeId(identifier: string): string {
  for (const prefix of ['temp-', 'mq2-']) {
    if (identifier.startsWith(prefix)) {
      const nodeId = identifier.slice(prefix.length);
      if (PHYSICAL_SENSOR_NODE_PATTERN.test(nodeId)) {
        return nodeId;
      }
    }
  }
  return identifier;
}

export function sensorDeviceMatchesNode(deviceId: string, nodeId: string): boolean {
  return (
    deviceId === nodeId
    || physicalSensorNodeId(deviceId) === physicalSensorNodeId(nodeId)
  );
}
