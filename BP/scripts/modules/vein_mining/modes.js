
export function GetPattern(
  mode,
  originPos,
  hitFace,
  viewDirection,
  maxBlocks,
) {
  const locations = [];
  if (mode === "Standard" || mode === "standard") return null;

  let determinedFace = hitFace;
  const absX = Math.abs(viewDirection.x);
  const absY = Math.abs(viewDirection.y);
  const absZ = Math.abs(viewDirection.z);

  const isVertical = absY > absX && absY > absZ;

  if (isVertical) {
    determinedFace = viewDirection.y > 0 ? "Down" : "Up";
  } else {
    if (absX > absZ) determinedFace = viewDirection.x > 0 ? "East" : "West";
    else determinedFace = viewDirection.z > 0 ? "South" : "North";
  }

  const dir = getCardinalDirection(viewDirection);
  const safeMode = mode.toLowerCase().replace(/\s+/g, "_");

  switch (safeMode) {
    case "line":
      generateLine(locations, dir, maxBlocks, isVertical, determinedFace);
      break;
    case "tunnel":
      generateTunnel(locations, dir, maxBlocks, determinedFace);
      break;
    case "2x1_tunnel":
      generateAdvancedTunnel(
        locations,
        dir,
        maxBlocks,
        1,
        2,
        isVertical,
        determinedFace,
      );
      break;
    case "2x2_tunnel":
      generateAdvancedTunnel(
        locations,
        dir,
        maxBlocks,
        2,
        2,
        isVertical,
        determinedFace,
      );
      break;
    case "3x3":
    case "small_square":
      generatePlane(locations, determinedFace, 3, maxBlocks);
      break;
    case "5x5":
      generatePlane(locations, determinedFace, 5, maxBlocks);
      break;
    case "3x3x3":
    case "large_square":
      generateCube(locations, 3, determinedFace, false, maxBlocks);
      break;
    case "5x5x5":
      generateCube(locations, 5, determinedFace, false, maxBlocks);
      break;
    case "hollow_cube":
      generateCube(locations, 6, determinedFace, true, maxBlocks);
      break;
    case "frame":
      generateFrame(locations, 8, determinedFace, maxBlocks);
      break;
    case "checker":
      generateChecker(locations, determinedFace, 8, maxBlocks);
      break;
    case "circle":
      generateCircleV2(locations, determinedFace, 3, maxBlocks);
      break;
    case "stairway_down":
    case "stairway":
      generateStairway(locations, dir, maxBlocks, -1);
      break;
    case "stairway_up":
      generateStairway(locations, dir, maxBlocks, 1);
      break;
    case "spiral_staircase":
      const verticalDir = viewDirection.y > 0 ? 1 : -1;
      generateSpiralStaircase(locations, dir, maxBlocks, verticalDir);
      break;
    case "plus_pattern":
      generatePlusPattern(locations, determinedFace, maxBlocks);
      break;
    case "circle_v2":
      generateCircleV2(locations, determinedFace, 7, maxBlocks);
      break;
    case "branch_mining":
      generateBranchMining(locations, dir, maxBlocks, determinedFace);
      break;
    case "3x3_tunnel":
      generateAdvancedTunnel(
        locations,
        dir,
        maxBlocks,
        3,
        3,
        isVertical,
        determinedFace,
      );
      break;
    case "diagonal_tunnel":
      generateDiagonalTunnel(
        locations,
        viewDirection,
        maxBlocks,
        determinedFace,
      );
      break;
    case "arc_tunnel":
      generateArcTunnel(locations, viewDirection, maxBlocks, determinedFace);
      break;
    case "star_pattern":
      generateStarPattern(locations, determinedFace, dir, maxBlocks);
      break;
    case "sphere_7x7":
      generateSphere(locations, 3, maxBlocks); 
      break;
    case "dome_builder":
      generateDome(locations, 5, determinedFace, maxBlocks);
      break;
    case "maze":
      generateMaze(locations, determinedFace, 15, maxBlocks); 
      break;
    case "maze_v2":
      generateMazeV2(locations, determinedFace, 31, maxBlocks);
      break;
    case "spiral":
      generateSpiral(locations, determinedFace, viewDirection, maxBlocks);
      break;
    case "random_chaos":
      generateRandomChaos(locations, maxBlocks);
      break;
    case "zigzag":
      generateZigzag(locations, determinedFace, viewDirection, maxBlocks);
      break;
    case "beacon_pyramid":
      generateBeaconPyramid(locations, determinedFace, maxBlocks);
      break;
    case "mega_chunk_16":
      generateMegaChunk(locations, determinedFace, 16, maxBlocks);
      break;
    case "heart_pattern":
      generateHeartPattern(locations, determinedFace, maxBlocks);
      break;
    case "5x5_tunnel":
      
      generateAdvancedTunnel(
        locations,
        dir,
        maxBlocks,
        5,
        5,
        isVertical,
        determinedFace,
      );
      break;
    case "hollow_cylinder":
      generateHollowCylinder(locations, determinedFace, 3, maxBlocks);
      break;
    case "strip_mining_grid":
      generateStripMiningGrid(
        locations,
        viewDirection,
        maxBlocks,
        determinedFace,
      );
      break;
    case "moat_trench":
      generateTrench(locations, viewDirection, maxBlocks, determinedFace);
      break;
    case "cone_funnel":
      
      generateCone(locations, determinedFace, 5, maxBlocks);
      break;
    case "room_clearer":
      generateRoomClearer(locations, viewDirection, maxBlocks, determinedFace);
      break;
    case "farm_grid":
      generateFarmGrid(locations, determinedFace, 4, 24, maxBlocks);
      break;
    case "diagonal_stairway_down":
      generateDiagonalStaircase(locations, viewDirection, maxBlocks, -1);
      break;
    case "diagonal_stairway_up":
      generateDiagonalStaircase(locations, viewDirection, maxBlocks, 1);
      break;
    default:
      break;
  }

  return locations;
}


function generateDiagonalStaircase(
  locations,
  viewDirection,
  maxBlocks,
  verticalDir,
) {
  
  const dx = viewDirection.x > 0 ? 1 : -1;
  const dz = viewDirection.z > 0 ? 1 : -1;

  
  for (let i = 0; i < maxBlocks; i++) {
    if (locations.length >= maxBlocks) return;

    
    const x = dx * i;
    const z = dz * i;
    const y = verticalDir * i;

    
    locations.push({ x, y, z });
    if (locations.length < maxBlocks) locations.push({ x, y: y + 1, z });
    if (locations.length < maxBlocks) locations.push({ x, y: y + 2, z });

    
    
    
    if (i > 0) {
      
      if (locations.length < maxBlocks)
        locations.push({ x: x - dx, y: y + 1, z });
      if (locations.length < maxBlocks)
        locations.push({ x: x - dx, y: y + 2, z });

      if (locations.length < maxBlocks)
        locations.push({ x, y: y + 1, z: z - dz });
      if (locations.length < maxBlocks)
        locations.push({ x, y: y + 2, z: z - dz });
    }
  }
}

function generateFarmGrid(
  locations,
  face,
  spacing = 4,
  gridSize = 15,
  maxBlocks = 256,
) {
  const offset = Math.floor(gridSize / 2); 

  for (let x = -offset; x <= offset; x++) {
    for (let z = -offset; z <= offset; z++) {
      
      if (x % spacing === 0 && z % spacing === 0) {
        if (locations.length >= maxBlocks) return;

        
        
        const base = getPlanePos(face, x, z);
        locations.push(base);
      }
    }
  }
}

function generateRoomClearer(locations, viewDirection, maxBlocks, face) {
  const dir = getCardinalDirection(viewDirection);

  let f = { x: 0, y: 0, z: 0 }; 
  let s = { x: 0, y: 0, z: 0 }; 
  let u = { x: 0, y: 1, z: 0 }; 

  
  switch (dir) {
    case "North":
      f.z = -1;
      s.x = 1;
      break;
    case "South":
      f.z = 1;
      s.x = -1;
      break;
    case "East":
      f.x = 1;
      s.z = 1;
      break;
    case "West":
      f.x = -1;
      s.z = -1;
      break;
  }

  
  const width = 9;
  const height = 5;
  const depth = 9;

  
  const halfW = Math.floor(width / 2);

  
  
  if (face === "Up") {
    u.y = -1;
  }

  
  for (let d = 0; d < depth; d++) {
    for (let h = 0; h < height; h++) {
      for (let w = -halfW; w <= halfW; w++) {
        if (locations.length >= maxBlocks) return;

        const x = f.x * d + s.x * w;
        const y = u.y * h;
        const z = f.z * d + s.z * w;

        locations.push({ x, y, z });
      }
    }
  }
}

function generateCone(locations, face, maxRadius, maxBlocks) {
  
  for (let d = 0; d <= maxRadius; d++) {
    
    const currentRadius = maxRadius - d;

    
    const rSq = (currentRadius + 0.5) * (currentRadius + 0.5);

    for (let u = -currentRadius; u <= currentRadius; u++) {
      for (let v = -currentRadius; v <= currentRadius; v++) {
        if (locations.length >= maxBlocks) return;

        
        if (u * u + v * v <= rSq) {
          
          addRelativePos(locations, face, u, v, d);
        }
      }
    }
  }
}


function generateTrench(locations, viewDirection, maxBlocks, face) {
  const dir = getCardinalDirection(viewDirection);

  let f = { x: 0, z: 0 }; 
  let s = { x: 0, z: 0 }; 

  
  switch (dir) {
    case "North":
      f.z = -1;
      s.x = 1;
      break;
    case "South":
      f.z = 1;
      s.x = -1;
      break;
    case "East":
      f.x = 1;
      s.z = 1;
      break;
    case "West":
      f.x = -1;
      s.z = -1;
      break;
  }

  const width = 2; 
  const depthDown = 3; 
  const length = Math.floor(maxBlocks / (width * depthDown));

  for (let i = 0; i < length; i++) {
    for (let w = 0; w < width; w++) {
      for (let d = 0; d < depthDown; d++) {
        if (locations.length >= maxBlocks) return;

        const x = f.x * i + s.x * w;
        const z = f.z * i + s.z * w;

        
        let y = -d;

        
        if (face === "Down") {
          y = d;
        }

        locations.push({ x, y, z });
      }
    }
  }
}

function generateStripMiningGrid(locations, viewDirection, maxBlocks, face) {
  const dir = getCardinalDirection(viewDirection);
  const absX = Math.abs(viewDirection.x);
  const absY = Math.abs(viewDirection.y);
  const absZ = Math.abs(viewDirection.z);
  const isVertical = absY > absX && absY > absZ;

  let f = { x: 0, y: 0, z: 0 }; 
  let s = { x: 0, y: 0, z: 0 }; 
  let u = { x: 0, y: 0, z: 0 }; 

  
  if (isVertical) {
    f.y = face === "Up" ? -1 : 1;
    switch (dir) {
      case "North":
        s.x = 1;
        u.z = 1;
        break;
      case "South":
        s.x = -1;
        u.z = 1;
        break;
      case "East":
        s.z = 1;
        u.x = 1;
        break;
      case "West":
        s.z = -1;
        u.x = 1;
        break;
    }
  } else {
    switch (dir) {
      case "North":
        f.z = -1;
        s.x = 1;
        break;
      case "South":
        f.z = 1;
        s.x = -1;
        break;
      case "East":
        f.x = 1;
        s.z = 1;
        break;
      case "West":
        f.x = -1;
        s.z = -1;
        break;
    }
    u.y = face === "Down" ? -1 : 1;
  }

  const width = 15; 
  const halfW = Math.floor(width / 2);
  const depthLimit = 30; 

  for (let d = 0; d < depthLimit; d++) {
    for (let w = -halfW; w <= halfW; w++) {
      if (locations.length >= maxBlocks) return;

      
      
      if (d % 3 === 0 || Math.abs(w) % 3 === 0) {
        const baseX = f.x * d + s.x * w;
        const baseY = f.y * d + s.y * w;
        const baseZ = f.z * d + s.z * w;

        
        locations.push({ x: baseX, y: baseY, z: baseZ });

        
        if (locations.length < maxBlocks) {
          locations.push({ x: baseX + u.x, y: baseY + u.y, z: baseZ + u.z });
        }
      }
    }
  }
}
function generateHeartPattern(locations, face, maxBlocks) {
  const scale = 6; 
  const step = 0.04; 

  const used = new Set();

  for (let y = 1.5; y >= -1.5; y -= step) {
    for (let x = -1.5; x <= 1.5; x += step) {
      if (locations.length >= maxBlocks) return;

      
      const eq = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;

      if (eq <= 0) {
        const u = Math.round(x * scale);
        const v = Math.round(y * scale);

        const key = `${u},${v}`;
        if (used.has(key)) continue;
        used.add(key);

        addRelativePos(locations, face, u, v, 0);
      }
    }
  }
}
function generateMegaChunk(locations, face, size, maxBlocks) {
  const half = Math.floor(size / 2);

  for (let d = 0; d < size; d++) {
    for (let i = -half; i < half; i++) {
      for (let j = -half; j < half; j++) {
        if (locations.length >= maxBlocks) return;

        addRelativePos(locations, face, i, j, d);
      }
    }
  }
}
function generateBeaconPyramid(locations, face, maxBlocks) {
  const layers = [3, 5, 7, 9];
  let depth = 0;

  for (const size of layers) {
    const half = Math.floor(size / 2);

    for (let u = -half; u <= half; u++) {
      for (let v = -half; v <= half; v++) {
        if (locations.length >= maxBlocks) return;
        addRelativePos(locations, face, u, v, depth);
      }
    }
    depth++;
  }
}
function getCardinalDirection(viewDir) {
  if (Math.abs(viewDir.x) > Math.abs(viewDir.z)) {
    return viewDir.x > 0 ? "East" : "West";
  }
  return viewDir.z > 0 ? "South" : "North";
}

function getPlanePos(face, u, v) {
  if (face === "Up" || face === "Down") return { x: u, y: 0, z: v };
  if (face === "North" || face === "South") return { x: u, y: v, z: 0 };
  return { x: 0, y: u, z: v };
}

function generateLine(locations, dir, maxBlocks, isVertical = false, face) {
  if (isVertical) {
    const dy = face === "Up" ? -1 : 1;
    for (let i = 0; i < maxBlocks; i++) {
      if (locations.length >= maxBlocks) break;
      locations.push({ x: 0, y: dy * i, z: 0 });
    }
  } else {
    let dx = 0,
      dz = 0;
    switch (dir) {
      case "North":
        dz = -1;
        break;
      case "South":
        dz = 1;
        break;
      case "East":
        dx = 1;
        break;
      case "West":
        dx = -1;
        break;
    }
    for (let i = 0; i < maxBlocks; i++) {
      if (locations.length >= maxBlocks) break;
      locations.push({ x: dx * i, y: 0, z: dz * i });
    }
  }
}

function generateTunnel(locations, dir, maxBlocks, face) {
  const depth = Math.floor(maxBlocks / 2);

  if (face === "Up" || face === "Down") {
    const dy = face === "Up" ? -1 : 1;
    let ox = 0,
      oz = 0;
    switch (dir) {
      case "North":
        oz = -1;
        break;
      case "South":
        oz = 1;
        break;
      case "East":
        ox = 1;
        break;
      case "West":
        ox = -1;
        break;
    }
    for (let i = 0; i < depth; i++) {
      if (locations.length >= maxBlocks) break;
      locations.push({ x: 0, y: dy * i, z: 0 });
      if (locations.length >= maxBlocks) break;
      locations.push({ x: ox, y: dy * i, z: oz });
    }
    return;
  }

  let dx = 0,
    dz = 0;
  switch (dir) {
    case "North":
      dz = -1;
      break;
    case "South":
      dz = 1;
      break;
    case "East":
      dx = 1;
      break;
    case "West":
      dx = -1;
      break;
  }
  for (let i = 0; i < depth; i++) {
    if (locations.length >= maxBlocks) break;
    locations.push({ x: dx * i, y: 0, z: dz * i });
    if (locations.length >= maxBlocks) break;
    locations.push({ x: dx * i, y: 1, z: dz * i });
  }
}

function generateAdvancedTunnel(
  locations,
  dir,
  maxBlocks,
  width,
  height,
  isVertical = false,
  face,
) {
  const area = width * height;
  const depth = Math.floor(maxBlocks / area);

  const widthOffset = Math.floor(width / 2);
  const heightOffset = Math.floor(height / 2);

  let forwardX = 0,
    forwardY = 0,
    forwardZ = 0;
  let widthDirX = 0,
    widthDirY = 0,
    widthDirZ = 0;
  let heightDirX = 0,
    heightDirY = 0,
    heightDirZ = 0;

  if (isVertical) {
    forwardY = face === "Up" ? -1 : 1;
    switch (dir) {
      case "North":
        widthDirX = 1;
        heightDirZ = 1;
        break;
      case "South":
        widthDirX = -1;
        heightDirZ = 1;
        break;
      case "East":
        widthDirZ = 1;
        heightDirX = 1;
        break;
      case "West":
        widthDirZ = -1;
        heightDirX = 1;
        break;
    }
  } else {
    switch (dir) {
      case "North":
        forwardZ = -1;
        widthDirX = 1;
        break;
      case "South":
        forwardZ = 1;
        widthDirX = -1;
        break;
      case "East":
        forwardX = 1;
        widthDirZ = 1;
        break;
      case "West":
        forwardX = -1;
        widthDirZ = -1;
        break;
    }
    heightDirY = 1;
  }

  for (let d = 0; d < depth || d === 0; d++) {
    const baseX = forwardX * d;
    const baseY = forwardY * d;
    const baseZ = forwardZ * d;

    for (let w = 0; w < width; w++) {
      const wPos = w - widthOffset;
      for (let h = 0; h < height; h++) {
        if (locations.length >= maxBlocks) return;
        const hPos = h - heightOffset;
        const x = baseX + widthDirX * wPos + heightDirX * hPos;
        const y = baseY + widthDirY * wPos + heightDirY * hPos;
        const z = baseZ + widthDirZ * wPos + heightDirZ * hPos;
        locations.push({ x, y, z });
      }
    }
  }
}

function generatePlane(locations, face, size, maxBlocks) {
  const offset = Math.floor(size / 2);
  for (let u = -offset; u <= offset; u++) {
    for (let v = -offset; v <= offset; v++) {
      if (locations.length >= maxBlocks) return;
      locations.push(getPlanePos(face, u, v));
    }
  }
}

function generateChecker(locations, face, size, maxBlocks) {
  const offset = Math.floor(size / 2);
  for (let u = -offset; u <= offset; u++) {
    for (let v = -offset; v <= offset; v++) {
      if (locations.length >= maxBlocks) return;
      if ((u + v) % 2 === 0) {
        locations.push(getPlanePos(face, u, v));
      }
    }
  }
}

function generateCircle(locations, face, radius, maxBlocks) {
  const rsq = radius * radius;
  for (let u = -radius; u <= radius; u++) {
    for (let v = -radius; v <= radius; v++) {
      if (locations.length >= maxBlocks) return;
      if (u * u + v * v <= rsq) {
        locations.push(getPlanePos(face, u, v));
      }
    }
  }
}

function generateCube(locations, size, face, hollow = false, maxBlocks) {
  const offset = Math.floor(size / 2);
  for (let i = -offset; i <= offset; i++) {
    for (let j = -offset; j <= offset; j++) {
      for (let d = 0; d < size; d++) {
        if (locations.length >= maxBlocks) return;
        if (
          hollow &&
          !(
            i === -offset ||
            i === offset ||
            j === -offset ||
            j === offset ||
            d === 0 ||
            d === size - 1
          )
        )
          continue;
        addRelativePos(locations, face, i, j, d);
      }
    }
  }
}

function generateFrame(locations, size, face, maxBlocks) {
  const offset = Math.floor(size / 2);
  for (let i = -offset; i <= offset; i++) {
    for (let j = -offset; j <= offset; j++) {
      for (let d = 0; d < size; d++) {
        if (locations.length >= maxBlocks) return;
        let edges = 0;
        if (i === -offset || i === offset) edges++;
        if (j === -offset || j === offset) edges++;
        if (d === 0 || d === size - 1) edges++;
        if (edges >= 2) {
          addRelativePos(locations, face, i, j, d);
        }
      }
    }
  }
}

function addRelativePos(locations, face, i, j, depth) {
  let pos;
  switch (face) {
    case "Up":
      pos = { x: i, y: -depth, z: j };
      break;
    case "Down":
      pos = { x: i, y: depth, z: j };
      break;
    case "North":
      pos = { x: i, y: j, z: -depth };
      break;
    case "South":
      pos = { x: i, y: j, z: depth };
      break;
    case "East":
      pos = { x: depth, y: j, z: i };
      break;
    case "West":
      pos = { x: -depth, y: j, z: i };
      break;
    default:
      pos = { x: i, y: j, z: depth };
  }
  locations.push(pos);
}

function generateStairway(locations, dir, maxBlocks, verticalDir) {
  let dx = 0,
    dz = 0;
  switch (dir) {
    case "North":
      dz = -1;
      break;
    case "South":
      dz = 1;
      break;
    case "East":
      dx = 1;
      break;
    case "West":
      dx = -1;
      break;
  }
  const steps = Math.floor(maxBlocks / 3);
  for (let i = 0; i < steps; i++) {
    const x = dx * i;
    const z = dz * i;
    const y = i * verticalDir;
    if (locations.length >= maxBlocks) break;
    locations.push({ x, y, z });
    if (locations.length >= maxBlocks) break;
    locations.push({ x, y: y + 1, z });
    if (locations.length >= maxBlocks) break;
    locations.push({ x, y: y + 2, z });
  }
}

function generateSpiralStaircase(locations, dir, maxBlocks, verticalDir) {
  const steps = Math.floor(maxBlocks / 3);
  const spiralOffsets = [
    { x: 0, z: -1 },
    { x: 1, z: -1 },
    { x: 1, z: 0 },
    { x: 1, z: 1 },
    { x: 0, z: 1 },
    { x: -1, z: 1 },
    { x: -1, z: 0 },
    { x: -1, z: -1 },
  ];

  let startIndex = 0;
  if (dir === "East") startIndex = 2;
  else if (dir === "South") startIndex = 4;
  else if (dir === "West") startIndex = 6;

  for (let i = 0; i < steps; i++) {
    const offset = spiralOffsets[(startIndex + i) % 8];
    const baseY = i * verticalDir;
    if (locations.length >= maxBlocks) break;
    locations.push({ x: offset.x, y: baseY, z: offset.z });
    if (locations.length >= maxBlocks) break;
    locations.push({ x: offset.x, y: baseY + 1, z: offset.z });
    if (locations.length >= maxBlocks) break;
    locations.push({ x: offset.x, y: baseY + 2, z: offset.z });
  }
}

function generateCircleV2(locations, face, radius, maxBlocks) {
  const rSq = (radius + 0.5) * (radius + 0.5);
  for (let u = -radius; u <= radius; u++) {
    for (let v = -radius; v <= radius; v++) {
      if (locations.length >= maxBlocks) return;
      if (u * u + v * v <= rSq) {
        locations.push(getPlanePos(face, u, v));
      }
    }
  }
}

function generateBranchMining(locations, dir, maxBlocks, face) {
  const isVertical = face === "Up" || face === "Down";

  let f = { x: 0, y: 0, z: 0 }; 
  let s = { x: 0, y: 0, z: 0 }; 
  let u = { x: 0, y: 0, z: 0 }; 

  if (isVertical) {
    f.y = face === "Up" ? -1 : 1;
    switch (dir) {
      case "North":
        s.x = 1;
        u.z = 1;
        break;
      case "South":
        s.x = -1;
        u.z = 1;
        break;
      case "East":
        s.z = 1;
        u.x = 1;
        break;
      case "West":
        s.z = -1;
        u.x = 1;
        break;
    }
  } else {
    switch (dir) {
      case "North":
        f.z = -1;
        s.x = 1;
        break;
      case "South":
        f.z = 1;
        s.x = -1;
        break;
      case "East":
        f.x = 1;
        s.z = 1;
        break;
      case "West":
        f.x = -1;
        s.z = -1;
        break;
    }
    u.y = face === "Down" ? -1 : 1;
  }

  for (let i = 0; i < maxBlocks; i++) {
    if (locations.length >= maxBlocks) break;

    const baseX = f.x * i;
    const baseY = f.y * i;
    const baseZ = f.z * i;

    if (locations.length < maxBlocks)
      locations.push({ x: baseX, y: baseY, z: baseZ });
    if (locations.length < maxBlocks)
      locations.push({ x: baseX + u.x, y: baseY + u.y, z: baseZ + u.z });

    if (i > 0 && i % 3 === 0) {
      for (let b = 1; b <= 6; b++) {
        
        const lx = baseX + s.x * b;
        const ly = baseY + s.y * b;
        const lz = baseZ + s.z * b;

        if (locations.length < maxBlocks)
          locations.push({ x: lx + u.x, y: ly + u.y, z: lz + u.z });

        const rx = baseX - s.x * b;
        const ry = baseY - s.y * b;
        const rz = baseZ - s.z * b;

        if (locations.length < maxBlocks)
          locations.push({ x: rx + u.x, y: ry + u.y, z: rz + u.z });
      }
    }
  }
}

function generateDiagonalTunnel(locations, viewDirection, maxBlocks, face) {
  const area = 2; 
  const depth = Math.floor(maxBlocks / area);

  const dx = viewDirection.x > 0 ? 1 : -1;
  const dz = viewDirection.z > 0 ? 1 : -1;

  const dy = face === "Down" ? -1 : 1;

  for (let i = 0; i < depth; i++) {
    if (locations.length >= maxBlocks) break;

    const x = i * dx;
    const z = i * dz;

    
    locations.push({ x: x, y: 0, z: z });
    if (locations.length < maxBlocks) {
      locations.push({ x: x, y: dy, z: z });
    }
  }
}

function generateArcTunnel(locations, viewDirection, maxBlocks, face) {
  const area = 1;
  const depth = Math.floor(maxBlocks / area);
  const radius = 18;

  const yaw = Math.atan2(viewDirection.x, viewDirection.z);
  const absX = Math.abs(viewDirection.x);
  const absY = Math.abs(viewDirection.y);
  const absZ = Math.abs(viewDirection.z);
  const isVertical = absY > absX && absY > absZ;

  let f, s, u;

  if (isVertical) {
    f = { x: 0, y: viewDirection.y > 0 ? 1 : -1, z: 0 };
    s = { x: Math.round(Math.sin(yaw)), y: 0, z: Math.round(Math.cos(yaw)) };
    u = { x: Math.round(Math.cos(yaw)), y: 0, z: Math.round(-Math.sin(yaw)) };
  } else {
    const fMag = Math.sqrt(viewDirection.x ** 2 + viewDirection.z ** 2);
    f = { x: viewDirection.x / fMag, y: 0, z: viewDirection.z / fMag };
    s = { x: -f.z, y: 0, z: f.x };
    u = { x: 0, y: face === "Down" ? -1 : 1, z: 0 };
  }

  for (let i = 0; i < depth; i++) {
    if (locations.length >= maxBlocks) break;

    const theta = i / radius;
    const localForward = radius * Math.sin(theta);
    const localSide = radius * (1 - Math.cos(theta));

    const baseX = Math.round(f.x * localForward + s.x * localSide);
    const baseY = Math.round(f.y * localForward + s.y * localSide);
    const baseZ = Math.round(f.z * localForward + s.z * localSide);

    for (let w = 0; w <= 1; w++) {
      for (let h = 0; h <= 1; h++) {
        if (locations.length >= maxBlocks) break;

        const finalX = baseX + Math.round(s.x) * w + u.x * h;
        const finalY = baseY + Math.round(s.y) * w + u.y * h;
        const finalZ = baseZ + Math.round(s.z) * w + u.z * h;

        if (
          !locations.some(
            (p) => p.x === finalX && p.y === finalY && p.z === finalZ,
          )
        ) {
          locations.push({ x: finalX, y: finalY, z: finalZ });
        }
      }
    }
  }
}

function generatePlusPattern(locations, face, maxBlocks) {
  const offsets = [
    { u: 0, v: 0 }, 
    { u: 0, v: 1 },
    { u: 0, v: -1 },
    { u: 1, v: 0 },
    { u: -1, v: 0 },
  ];

  for (const offset of offsets) {
    if (locations.length >= maxBlocks) break;
    locations.push(getPlanePos(face, offset.u, offset.v));
  }
}
function generateStarPattern(locations, face, dir, maxBlocks) {
  const offsets = [
    { u: 0, v: 6 },
    { u: -1, v: 5 },
    { u: 0, v: 5 },
    { u: 1, v: 5 },
    { u: -1, v: 4 },
    { u: 0, v: 4 },
    { u: 1, v: 4 },
    { u: -2, v: 3 },
    { u: -1, v: 3 },
    { u: 0, v: 3 },
    { u: 1, v: 3 },
    { u: 2, v: 3 },
    { u: -5, v: 2 },
    { u: -4, v: 2 },
    { u: -3, v: 2 },
    { u: -2, v: 2 },
    { u: -1, v: 2 },
    { u: 0, v: 2 },
    { u: 1, v: 2 },
    { u: 2, v: 2 },
    { u: 3, v: 2 },
    { u: 4, v: 2 },
    { u: 5, v: 2 },
    { u: -4, v: 1 },
    { u: -3, v: 1 },
    { u: -2, v: 1 },
    { u: -1, v: 1 },
    { u: 0, v: 1 },
    { u: 1, v: 1 },
    { u: 2, v: 1 },
    { u: 3, v: 1 },
    { u: 4, v: 1 },
    { u: -3, v: 0 },
    { u: -2, v: 0 },
    { u: -1, v: 0 },
    { u: 0, v: 0 },
    { u: 1, v: 0 },
    { u: 2, v: 0 },
    { u: 3, v: 0 },
    { u: -2, v: -1 },
    { u: -1, v: -1 },
    { u: 0, v: -1 },
    { u: 1, v: -1 },
    { u: 2, v: -1 },
    { u: -3, v: -2 },
    { u: -2, v: -2 },
    { u: 2, v: -2 },
    { u: 3, v: -2 },
    { u: -4, v: -3 },
    { u: -3, v: -3 },
    { u: 3, v: -3 },
    { u: 4, v: -3 },
    { u: -4, v: -4 },
    { u: 4, v: -4 },
  ];

  for (const offset of offsets) {
    if (locations.length >= maxBlocks) break;

    let x = 0,
      y = 0,
      z = 0;
    const u = offset.u;
    const v = offset.v;

    if (face === "Up" || face === "Down") {
      
      y = 0;
      switch (dir) {
        case "North":
          x = u;
          z = -v;
          break; 
        case "South":
          x = -u;
          z = v;
          break; 
        case "East":
          x = v;
          z = u;
          break; 
        case "West":
          x = -v;
          z = -u;
          break; 
      }
    } else {
      
      y = v;
      switch (face) {
        case "North":
          x = u;
          z = 0;
          break;
        case "South":
          x = -u;
          z = 0;
          break;
        case "East":
          x = 0;
          z = -u;
          break;
        case "West":
          x = 0;
          z = u;
          break;
      }
    }

    if (!locations.some((p) => p.x === x && p.y === y && p.z === z)) {
      locations.push({ x, y, z });
    }
  }
}

function generateSphere(locations, radius, maxBlocks) {
  let temp = [];

  const rSq = (radius + 0.5) * (radius + 0.5);

  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + y * y + z * z;
        
        if (distSq <= rSq) {
          temp.push({ x, y, z, d: distSq });
        }
      }
    }
  }

  temp.sort((a, b) => a.d - b.d);

  for (const p of temp) {
    if (locations.length >= maxBlocks) break; 
    locations.push({ x: p.x, y: p.y, z: p.z }); 
  }
}

function generateDome(locations, radius, face, maxBlocks) {
  let temp = [];
  const rSq = (radius + 0.5) * (radius + 0.5);

  for (let x = -radius; x <= radius; x++) {
    for (let y = 0; y <= radius; y++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + y * y + z * z;
        if (distSq <= rSq) {
          temp.push({ x, y, z, d: distSq });
        }
      }
    }
  }
  temp.sort((a, b) => a.d - b.d);

  for (const p of temp) {
    if (locations.length >= maxBlocks) break;

    addRelativePos(locations, face, p.x, p.z, p.y);
  }
}


function generateMaze(locations, face, size, maxBlocks) {
  const grid = [];
  for (let i = 0; i < size; i++) {
    grid[i] = new Array(size).fill(0);
  }

  const path = [];
  const stack = [{ u: 0, v: 0 }];
  grid[0][0] = 1;

  while (stack.length > 0 && path.length < maxBlocks) {
    const current = stack[stack.length - 1];
    const neighbors = [];

    
    [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ].forEach(([du, dv]) => {
      const nu = current.u + du;
      const nv = current.v + dv;
      if (nu >= 0 && nu < size && nv >= 0 && nv < size && grid[nu][nv] === 0) {
        neighbors.push({ u: nu, v: nv, du, dv });
      }
    });

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      
      grid[next.u][next.v] = 1;
      grid[current.u + next.du / 2][current.v + next.dv / 2] = 1;

      path.push({ u: current.u + next.du / 2, v: current.v + next.dv / 2 });
      path.push({ u: next.u, v: next.v });

      stack.push(next);
    } else {
      stack.pop();
    }
  }

  
  path.forEach((p) => {
    if (locations.length < maxBlocks) {
      locations.push(
        getPlanePos(
          face,
          p.u - Math.floor(size / 2),
          p.v - Math.floor(size / 2),
        ),
      );
    }
  });
}

function generateMazeV2(locations, face, size, maxBlocks) {
  const grid = [];
  for (let i = 0; i < size; i++) grid[i] = new Array(size).fill(0);

  const stack = [{ u: 0, v: 0 }];
  grid[0][0] = 1;

  
  const upDir = face === "Up" ? -1 : 1;

  while (stack.length > 0 && locations.length < maxBlocks) {
    const current = stack[stack.length - 1];
    const neighbors = [];

    
    [
      [0, 2],
      [0, -2],
      [2, 0],
      [-2, 0],
    ].forEach(([du, dv]) => {
      const nu = current.u + du;
      const nv = current.v + dv;
      if (nu >= 0 && nu < size && nv >= 0 && nv < size && grid[nu][nv] === 0) {
        neighbors.push({ u: nu, v: nv, du, dv });
      }
    });

    if (neighbors.length > 0) {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];

      
      const pointsToMine = [
        { u: current.u + next.du / 2, v: current.v + next.dv / 2 },
        { u: next.u, v: next.v },
      ];

      for (const p of pointsToMine) {
        if (locations.length >= maxBlocks) break;

        
        const base = getPlanePos(
          face,
          p.u - Math.floor(size / 2),
          p.v - Math.floor(size / 2),
        );
        locations.push(base);

        
        if (locations.length < maxBlocks) {
          const head = { ...base };
          if (face === "Up" || face === "Down") head.y += upDir;
          else head.y += 1;
          locations.push(head);
        }
      }

      grid[next.u][next.v] = 1;
      grid[current.u + next.du / 2][current.v + next.dv / 2] = 1;
      stack.push(next);
    } else {
      stack.pop();
    }
  }
}
function generateSpiral(locations, face, viewDirection, maxBlocks) {
  const dir = getCardinalDirection(viewDirection);

  
  let uVec = { x: 0, y: 0, z: 0 };
  if (face === "Up" || face === "Down") {
    uVec.y = face === "Up" ? -1 : 1;
  } else {
    uVec.y = 1;
  }

  let u = 0,
    v = 0;
  let stepSize = 2;
  let directions = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]; 
  let currentDir = 0;

  
  const isInBounds = (uu, vv) => Math.abs(uu) <= 15 && Math.abs(vv) <= 15;

  const addStep = (uu, vv) => {
    if (locations.length >= maxBlocks || !isInBounds(uu, vv)) return false;

    
    let rotatedU = uu,
      rotatedV = vv;
    switch (dir) {
      case "South":
        rotatedU = -uu;
        rotatedV = -vv;
        break;
      case "East":
        rotatedU = vv;
        rotatedV = -uu;
        break;
      case "West":
        rotatedU = -vv;
        rotatedV = uu;
        break;
    }

    const base = getPlanePos(face, rotatedU, rotatedV);

    
    if (
      !locations.some((p) => p.x === base.x && p.y === base.y && p.z === base.z)
    ) {
      locations.push(base);
    }

    
    if (locations.length < maxBlocks) {
      const head = {
        x: base.x + uVec.x,
        y: base.y + uVec.y,
        z: base.z + uVec.z,
      };
      if (
        !locations.some(
          (p) => p.x === head.x && p.y === head.y && p.z === head.z,
        )
      ) {
        locations.push(head);
      }
    }
    return true;
  };

  
  addStep(0, 0);

  
  while (locations.length < maxBlocks && stepSize <= 30) {
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < stepSize; i++) {
        u += directions[currentDir][0];
        v += directions[currentDir][1];
        if (!addStep(u, v)) break;
      }
      currentDir = (currentDir + 1) % 4;
    }
    stepSize += 2; 
  }
}

function generateRandomChaos(locations, maxBlocks) {
  let queue = [{ x: 0, y: 0, z: 0 }];
  let visited = new Set(["0,0,0"]);

  while (queue.length > 0 && locations.length < maxBlocks) {
    
    let index = Math.floor(Math.random() * queue.length);
    let current = queue.splice(index, 1)[0];

    
    if (Math.random() > 0.4) {
      locations.push({ x: current.x, y: current.y, z: current.z });
    }

    
    const neighbors = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ];

    for (let n of neighbors) {
      let next = { x: current.x + n.x, y: current.y + n.y, z: current.z + n.z };
      let key = `${next.x},${next.y},${next.z}`;

      
      if (!visited.has(key) && visited.size < maxBlocks * 2) {
        visited.add(key);
        queue.push(next);
      }
    }
  }
}


function generateZigzag(locations, face, viewDirection, maxBlocks) {
  const dir = getCardinalDirection(viewDirection);
  const absX = Math.abs(viewDirection.x);
  const absY = Math.abs(viewDirection.y);
  const absZ = Math.abs(viewDirection.z);
  const isVertical = absY > absX && absY > absZ;

  
  let f = { x: 0, y: 0, z: 0 };
  let s = { x: 0, y: 0, z: 0 };
  let u = { x: 0, y: 0, z: 0 };

  if (isVertical) {
    f.y = face === "Up" ? -1 : 1;
    if (dir === "North" || dir === "South") {
      s.x = 1;
      u.z = 1;
    } else {
      s.z = 1;
      u.x = 1;
    }
  } else {
    switch (dir) {
      case "North":
        f.z = -1;
        s.x = 1;
        break;
      case "South":
        f.z = 1;
        s.x = -1;
        break;
      case "East":
        f.x = 1;
        s.z = 1;
        break;
      case "West":
        f.x = -1;
        s.z = -1;
        break;
    }
    u.y = face === "Down" ? -1 : 1;
  }

  let currX = 0,
    currY = 0,
    currZ = 0;
  let sideDirection = 1; 
  const segmentLength = 3; 

  for (let i = 0; i < maxBlocks; i++) {
    
    for (let j = 0; j < segmentLength; j++) {
      if (locations.length >= maxBlocks) return;

      
      locations.push({ x: currX, y: currY, z: currZ });
      if (locations.length < maxBlocks) {
        locations.push({ x: currX + u.x, y: currY + u.y, z: currZ + u.z });
      }

      
      currX += f.x;
      currY += f.y;
      currZ += f.z;
    }

    
    for (let k = 0; k < segmentLength; k++) {
      if (locations.length >= maxBlocks) return;

      locations.push({ x: currX, y: currY, z: currZ });
      if (locations.length < maxBlocks) {
        locations.push({ x: currX + u.x, y: currY + u.y, z: currZ + u.z });
      }

      currX += s.x * sideDirection;
      currY += s.y * sideDirection;
      currZ += s.z * sideDirection;
    }

    
    sideDirection *= -1;
  }
}

function generateHollowCylinder(locations, face, radius, maxBlocks) {
  const rInSq = (radius - 0.5) * (radius - 0.5);
  const rOutSq = (radius + 0.5) * (radius + 0.5);

  
  const ringPoints = [];
  for (let u = -radius; u <= radius; u++) {
    for (let v = -radius; v <= radius; v++) {
      const distSq = u * u + v * v;
      
      if (distSq >= rInSq && distSq <= rOutSq) {
        ringPoints.push({ u, v });
      }
    }
  }

  
  let depth = 0;
  while (locations.length < maxBlocks) {
    for (const pt of ringPoints) {
      if (locations.length >= maxBlocks) return;
      
      addRelativePos(locations, face, pt.u, pt.v, depth);
    }
    depth++;
  }
}
