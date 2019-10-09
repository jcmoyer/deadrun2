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

export function buildInterleavedMesh(mesh: Mesh): number[] {
  const meshVerts: number[] = [];
  for (let i = 0; i < mesh.faces.length; ++i) {
    const face = mesh.faces[i];
    meshVerts.push(mesh.vertices[face[0][0]][0]);
    meshVerts.push(mesh.vertices[face[0][0]][1]);
    meshVerts.push(mesh.vertices[face[0][0]][2]);
    meshVerts.push(mesh.texCoords[face[0][1]][0]);
    meshVerts.push(mesh.texCoords[face[0][1]][1]);

    meshVerts.push(mesh.vertices[face[1][0]][0]);
    meshVerts.push(mesh.vertices[face[1][0]][1]);
    meshVerts.push(mesh.vertices[face[1][0]][2]);
    meshVerts.push(mesh.texCoords[face[1][1]][0]);
    meshVerts.push(mesh.texCoords[face[1][1]][1]);

    meshVerts.push(mesh.vertices[face[2][0]][0]);
    meshVerts.push(mesh.vertices[face[2][0]][1]);
    meshVerts.push(mesh.vertices[face[2][0]][2]);
    meshVerts.push(mesh.texCoords[face[2][1]][0]);
    meshVerts.push(mesh.texCoords[face[2][1]][1]);
  }
  return meshVerts;
}
