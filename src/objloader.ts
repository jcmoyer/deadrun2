function parseFaceVertex(s: string): [number, number] {
  const parts = s.split('/');
  return [parseInt(parts[0]) - 1, parseInt(parts[1]) - 1];
}

export type Vertex = [number, number, number];
export type TexCoord = [number, number];
export type Face = [[number, number], [number, number], [number, number]];
export type Mesh = {
  vertices: Vertex[];
  texCoords: TexCoord[];
  faces: Face[];
}

export function loadObj(data: string): Mesh {
  const lines = data.split(/\n/g);

  const vertices: Vertex[] = [];
  const texCoords: TexCoord[] = [];
  const faces: Face[] = [];

  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const parts = line.split(' ');

    if (parts[0] === 'v') {
      vertices.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ]);
    } else if (parts[0] === 'vt') {
      texCoords.push([
        parseFloat(parts[1]),
        1.0 - parseFloat(parts[2])
      ]);
    } else if (parts[0] === 'f') {
      faces.push([
        parseFaceVertex(parts[1]),
        parseFaceVertex(parts[2]),
        parseFaceVertex(parts[3])
      ]);
    }
  }

  return {
    vertices, texCoords, faces
  };
}
