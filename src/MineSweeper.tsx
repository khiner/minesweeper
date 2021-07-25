import { useEffect, useMemo, useState } from "react";

const deepCopy = (object: unknown) => JSON.parse(JSON.stringify(object));

const createSquare = (size: number, generator: (y: number, x: number) => any) =>
  Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => generator(y, x))
  );

type Mask = boolean[][];

const createMask = (size: number, probability: number): Mask =>
  createSquare(size, (y, x) => Math.random() < probability);
const orMasks = (...masks: Mask[]): Mask =>
  createSquare(masks[0].length, (y, x) => masks.some((mask) => mask[y][x]));
const andMasks = (...masks: Mask[]): Mask =>
  createSquare(masks[0].length, (y, x) => masks.every((mask) => mask[y][x]));
const any = (mask: Mask): boolean =>
  mask.some((row) => row.some((element) => element));
const all = (mask: Mask): boolean =>
  mask.every((row) => row.every((element) => element));
const masksEqual = (maskA: Mask, maskB: Mask) =>
  maskA.every((row, y) => row.every((element, x) => element === maskB[y][x]));

const onNeighbors = (
  y: number,
  x: number,
  onNeighbor: (y: number, x: number) => void
) => {
  for (let neighborY = y - 1; neighborY <= y + 1; neighborY++) {
    for (let neighborX = x - 1; neighborX <= x + 1; neighborX++) {
      if (neighborY !== y || neighborX !== x) {
        onNeighbor(neighborY, neighborX);
      }
    }
  }
};

const countTrueNeighbors = (y: number, x: number, mask: Mask) => {
  let trueNeighborCount = 0;
  onNeighbors(y, x, (y, x) => (trueNeighborCount += mask[y]?.[x] ? 1 : 0));
  return trueNeighborCount;
};

interface Cell {
  x: number;
  y: number;
  isMine: boolean;
  isRevealed: boolean;
  numNeighborMines: number;
  isFlag: boolean;
}

function CellDisplayInner({ cell }: { cell: Cell }) {
  const { isMine, isFlag, isRevealed, numNeighborMines } = cell;

  if (isRevealed) {
    if (isMine) return <div>M</div>;
    if (numNeighborMines) return <div>{numNeighborMines}</div>;
    return <div></div>;
  }
  if (isFlag) return <div>F</div>;
  return (
    <div
      style={{ backgroundColor: "gray", width: "100%", height: "100%" }}
    ></div>
  );
}

interface CellSquareProps {
  cell: Cell;
  sizePixels: number;
  onClick: (cell: Cell) => void;
  onSecondaryClick: (cell: Cell) => void;
}

function CellSquare({
  cell,
  sizePixels,
  onClick,
  onSecondaryClick,
}: CellSquareProps) {
  return (
    <div
      style={{
        width: sizePixels,
        height: sizePixels,
        border: "1px solid black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={() => onClick(cell)}
      onContextMenu={(event) => {
        event.preventDefault();
        onSecondaryClick(cell);
      }}
    >
      <CellDisplayInner cell={cell} />
    </div>
  );
}

interface CellsProps {
  cells: Cell[][];
  cellSizePixels: number;
  onClick: (cell: Cell) => void;
  onSecondaryClick: (cell: Cell) => void;
}

function Cells({
  cells,
  cellSizePixels,
  onClick,
  onSecondaryClick,
}: CellsProps) {
  return (
    <div style={{ width: "fit-content", border: "2px solid black" }}>
      <div
        style={{ display: "flex", flexDirection: "column", cursor: "pointer" }}
      >
        {cells.map((cellRow, y) => (
          <div key={y} style={{ display: "flex", flexDirection: "row" }}>
            {cellRow.map((cell) => (
              <CellSquare
                key={`${cell.y},${cell.x}`}
                cell={cell}
                sizePixels={cellSizePixels}
                onClick={onClick}
                onSecondaryClick={onSecondaryClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

enum GameState {
  ACTIVE,
  WON,
  LOST,
}

export default function MineSweeper() {
  const sizeCells = 10;
  const mineProbability = 0.2;
  const [mineMask, setMineMask] = useState(createMask(sizeCells, 0));
  const [revealedMask, setRevealedMask] = useState(createMask(sizeCells, 0));
  const [flagMask, setFlagMask] = useState(createMask(sizeCells, 0));
  const [gameState, setGameState] = useState(GameState.ACTIVE);

  const mineNeighborCounts = useMemo(
    () => createSquare(sizeCells, (y, x) => countTrueNeighbors(y, x, mineMask)),
    [mineMask]
  );

  const startGame = () => {
    setGameState(GameState.ACTIVE);
    setMineMask(createMask(sizeCells, mineProbability));
    setRevealedMask(createMask(sizeCells, 0));
    setFlagMask(createMask(sizeCells, 0));
  };

  useEffect(() => {
    startGame();
  }, [sizeCells, mineProbability]);

  useEffect(() => {
    if (any(andMasks(revealedMask, mineMask))) {
      setGameState(GameState.LOST);
    } else if (
      all(orMasks(revealedMask, flagMask)) &&
      masksEqual(flagMask, mineMask)
    ) {
      setGameState(GameState.WON);
    }
  }, [mineMask, flagMask, revealedMask]);

  useEffect(() => {
    if (gameState === GameState.LOST) {
      setRevealedMask(createMask(sizeCells, 1));
    }
  }, [gameState]);

  const cellSizePixels = 20;
  const cells = createSquare(sizeCells, (y, x) => ({
    x,
    y,
    isMine: mineMask[y][x],
    isRevealed: revealedMask[y][x],
    numNeighborMines: mineNeighborCounts[y][x],
    isFlag: flagMask[y][x],
  }));

  return (
    <div
      style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <button
        onClick={startGame}
        style={{
          margin: 5,
          padding: 0,
          width: 25,
          height: 25,
          fontSize: 20,
          lineHeight: 1,
          backgroundColor: "white",
          borderRadius: 5,
          border: "1px solid gray",
        }}
      >
        {gameState === GameState.ACTIVE && "😊"}
        {gameState === GameState.WON && "😎"}
        {gameState === GameState.LOST && "😵"}
      </button>
      <Cells
        cells={cells}
        cellSizePixels={cellSizePixels}
        onClick={(cell) => {
          const { y, x } = cell;
          if (revealedMask[y][x]) return;

          const newRevealedMask = deepCopy(revealedMask);
          newRevealedMask[y][x] = true;

          if (!mineMask[y][x] && mineNeighborCounts[y][x] === 0) {
            const noMineNeighbors: { y: number; x: number }[] = [{ y, x }];
            while (noMineNeighbors.length > 0) {
              const { y, x } = noMineNeighbors.pop() as {
                y: number;
                x: number;
              };
              onNeighbors(y, x, (y, x) => {
                if (!mineMask[y]?.[x] && newRevealedMask[y]?.[x] === false) {
                  newRevealedMask[y][x] = true;
                  if (
                    mineNeighborCounts[y]?.[x] === 0 &&
                    !noMineNeighbors.some(
                      ({ y: otherY, x: otherX }) => otherY === y && otherX === x
                    )
                  ) {
                    noMineNeighbors.push({ y, x });
                  }
                }
              });
            }
          }

          setRevealedMask(newRevealedMask);
        }}
        onSecondaryClick={(cell) => {
          const { y, x } = cell;
          if (revealedMask[y][x]) return;

          const newFlagMask = deepCopy(flagMask);
          newFlagMask[y][x] = !newFlagMask[y][x];
          setFlagMask(newFlagMask);
        }}
      />
    </div>
  );
}
