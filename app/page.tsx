"use client";

import { useEffect, useState, useCallback, useRef } from "react"; 
import BoardComponent from "./ui/boardComponent";
import io from "socket.io-client";
import { Board, encode, decode } from "./lib/board";
import { Config } from "chessground/config";
import { Clock } from "./ui/clock";
import { Button } from "@mui/material";
import { Chat } from "./ui/chat";
import { Api } from "chessground/api";
import { Chessground } from "chessground";
import { Key, Piece } from "chessground/types";
import { Move, PAWN } from "chess.js";
import { Pocket } from "./ui/pocket";

import Image from "next/image"

import "./page.css"

const socket = io("http://localhost:8080"); 

type Side = "white" | "black" | undefined;


export default function Home() {

  const [playing, setPlaying] = useState<boolean>(false); 
  const [board] = useState<Board>(new Board()); 
  const [cg, setCg] = useState<Api>(); 
  const [config, setConfig] = useState<Config>({}); 
  const [partnerConfig, setPartnerConfig] = useState<Config>({movable: {free: false}});

  const [times, setTimes] = useState<number[]>([1800, 1800, 1800, 1800]);  
  const [running, setRunning] = useState<boolean[]>([false, false, false, false]); 

  const [hand, setHand] = useState<string[]>(["", "p", "", ""]);
  const [side, setSide] = useState<Side>("white"); 

  const them = (side: Side) => {
    return side === "white" ? "black" : "white";
  }

  const updateTime = (index: number, newTime: number) => {
    setTimes((currentTimes) => {
        const updatedTimes = [...currentTimes];
        updatedTimes[index] = newTime;
        return updatedTimes;
    });
  };

  const updateRunning = (index: number, isRunning: boolean) => {
    setRunning((currentRunning) => {
      let updatedRunning = [...currentRunning];
      updatedRunning[index] = isRunning; 
      return updatedRunning; 
    });
  }

  const onMove = (orig: string, dest: string) => {
    let move = orig + dest; 
    if (move === "e1a1") {
        move = "e1c1"; 
    }
    if (move === "e1h1") {
        move = "e1g1"; 
    }
    if (move === "e8a8") {
        move = "e8c8"; 
    }
    if (move === "e8h8") {
        move = "e8g8"; 
    }
     
    if (board.board[0].get(orig).type === PAWN && (dest[1] == "1" || dest[1] == "8")) {
      move += "q";
    }

    socket.emit("message", `move ${encode(move)}`);
    board.play(move);

    updateRunning(0, true); 
    updateRunning(1, false);
  };

  const onDrop = (role: string, key: string) => {
    let move = (role[0] === "k" ? "n" : role[0]) + "@" + key; 
    if (board.isLegal(move)) {
      socket.emit("message", `move ${encode(move)}`);
      board.play(move);
      updateRunning(0, true); 
      updateRunning(1, false);
    }
  }

  const onPremove = (orig: string, dest: string) => {
    let move = orig + dest; 
    if (move === "e1a1") {
        move = "e1c1"; 
    }
    if (move === "e1h1") {
        move = "e1g1"; 
    }
    if (move === "e8a8") {
        move = "e8c8"; 
    }
    if (move === "e8h8") {
        move = "e8g8"; 
    }
    socket.emit("message", `premove ${encode(move)} false`);
  }
  
  const cancelPremoves = () => {
    socket.emit("message", `cancel`);
  }

  useEffect(() => {
    const messageHandler = (data : any) => {
      const args = data.toString().split(" ");
      if (args[0] === "finished") {
        setPlaying(false);
      }
      if (args[0] === "starting") {
        setPlaying(true);
        board.reset(); 
        setSide(undefined);
      }
      else if (args[0] === "userside") {
        if (side != args[1]) {
          setSide(args[1]); 

          cg?.set({
            orientation: args[1],
            movable: {
              ...config.movable, 
              color: args[1],
            },
            turnColor: "white", // White goes first
            fen: "start",
          });
          setPartnerConfig(config => ({
            orientation: them(args[1]),
          }));
        }
      }
      else if (args[0] === "moves1") {
        const fen = board.doMoves(args[1], 0);
        if (fen !== null) {
          cg?.cancelPremove();
          cg?.cancelPredrop();
          cg?.set({
            movable: {
              ...config.movable, 
              dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
            },
            fen: fen,
            turnColor: board.getTurn(0), 
            lastMove: board.lastMove(0),
            check: board.board[0].inCheck(),
          });
        }
      }
      else if (args[0] === "moves2") {
        const fen = board.doMoves(args[1], 1);
        if (fen !== null) {
          setPartnerConfig(config => ({...config,
            fen: fen,
            lastMove: board.lastMove(1)
          }));
        }
      }
      else if (args[0] === "times1") {
        const newTimes = args[1].split(",");
        if (side === "white") {
          setTimes(times => ([newTimes[1], newTimes[0], times[2], times[3]]));
        }
        else {
          setTimes(times => ([newTimes[0], newTimes[1], times[2], times[3]]));
        }
      }
      else if (args[0] === "times2") {
        const newTimes = args[1].split(",");
        if (side === "white") {
          setTimes(times => ([times[0], times[1], newTimes[0], newTimes[1]]));
        }
        else {
          setTimes(times => ([times[0], times[1], newTimes[1], newTimes[0]]));
        }
      }
      else if (args[0] === "whitehand1") {
        if (side === "white") {
          setHand(prevHand => [prevHand[0], args[1], prevHand[2], prevHand[3]]);
        }
        else {
          setHand(prevHand => [args[1], prevHand[1], prevHand[2], prevHand[3]]);
        }
        board.setWhitehand(args[1]); 
      }
      else if (args[0] === "blackhand1") {
        if (side === "white") {
          setHand(prevHand => [args[1], prevHand[1], prevHand[2], prevHand[3]]);
        }
        else {
          setHand(prevHand => [prevHand[0], args[1], prevHand[2], prevHand[3]]);
        }
        board.setBlackhand(args[1]); 
      }
      else if (args[0] === "whitehand2") {
        if (side === "white") {
          setHand(prevHand => [prevHand[0], prevHand[1], args[1], prevHand[3]]);
        }
        else {
          setHand(prevHand => [prevHand[0], prevHand[1], prevHand[2], args[1]]);
        }
      }
      else if (args[0] === "blackhand2") {
        if (side === "white") {
          setHand(prevHand => [prevHand[0], prevHand[1], prevHand[2], args[1]]);
        }
        else {
          setHand(prevHand => [prevHand[0], prevHand[1], args[1], prevHand[3]]);
        }
      }

      if (playing) {
        if (side !== undefined) {
          if (board.board[0].turn() === side[0]) {
            updateRunning(0, false); 
            updateRunning(1, true); 
          }
          else {
            updateRunning(0, true); 
            updateRunning(1, false); 
          }
          if (board.board[1].turn() === side[0]) {
            updateRunning(2, true); 
            updateRunning(3, false); 
          }
          else {
            updateRunning(2, false); 
            updateRunning(3, true); 
          }
        } 
      }
      else {
        setRunning([false, false, false, false]);
      }
    }; 

    socket.on("message", messageHandler);

    return () => {
      socket.off("message", messageHandler);
    };
  }, [cg, config, board, side, running]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    //cg?.move("e7", "e5");
      // for crazyhouse and board editors
    //cg?.newPiece({ color: "black", role: "queen"}, "a3");
    //cg?.set({
    ////    movable: {
    //        dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
    //    },
    //});
    //board.board[0].load("rn1qkbnr/pP1bp1pp/5p2/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5");
    //cg?.set({
    //  ...config,
     // fen: "rn1qkbnr/pP1bp1pp/5p2/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5",
    //  movable: {
    //    dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
    //  },
    //});
    cg?.move("b7", "a8");
    const newPieces = new Map<Key, Piece | undefined>();
    newPieces.set("a8", { role: "queen", color: "white" });
    cg?.setPieces(newPieces);
    //cg?.newPiece({ color: "white", role: "queen"}, "a6");
    //cg?.dragNewPiece({ color: "white", role: "pawn"}, event.nativeEvent as unknown as MouseEvent); 

    console.log(`Key pressed: ${event.key}`);

  }, [cg]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [handleKeyPress]);

  function convertToDestsMap(moves : Move[]) {
    const dests = new Map();
    moves.forEach(move => {
        if (!dests.has(move.from)) {
            dests.set(move.from, []);
        }
        if (move.from === "e1" && move.to === "g1") {
          dests.get(move.from).push("h1");
        }
        if (move.from === "e1" && move.to === "c1") {
          dests.get(move.from).push("a1");
        }
        if (move.from === "e8" && move.to === "g8") {
          dests.get(move.from).push("h8");
        }
        if (move.from === "e8" && move.to === "c8") {
          dests.get(move.from).push("a8");
        }
        dests.get(move.from).push(move.to);
    });
    return dests;
  }

  const play = () => {
    socket.emit("message", "seek");
  };

  const resign = () => {
    socket.emit("message", "resign");
  };

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const config = {
        movable: {
          events: {
            after: (orig: string, dest: string, metadata: any) => {
              onMove(orig, dest);
              cg.set({
                  movable: {
                      dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
                  },
                  turnColor: board.getTurn(0),
                  check: board.board[0].inCheck(),
              });
            },
            afterNewPiece: (role: string, key: string) => {
              onDrop(role, key); 
              cg.set({
                  movable: {
                      dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
                  },
                  fen: board.board[0].fen(),
                  turnColor: board.getTurn(0),
                  check: board.board[0].inCheck(),
              });
            }
          },
          free: false, 
          dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
        },
        premovable: {
          enabled: true, 
          showDests: true, 
          events: {
              set: (orig: string , dest: string) => {
                onPremove(orig, dest); 
              },
              unset: () => {
                cancelPremoves(); 
                cg.cancelPremove(); 
              }
          }
        },
        predroppable: {
          enabled: true,
          events: {
            set: (role: string, key: string) => {
              let move = (role[0] === "k" ? "n" : role[0]) + "@" + key; 
              socket.emit("message", `premove ${encode(move)} false`);
            },
            unset: () => {
              cancelPremoves(); 
              cg.cancelPredrop(); 
            }
          }
        },
      };
      const cg = Chessground(ref.current, config);
      setCg(cg); 
      setConfig(config); 
    }
  },[]);

  const rotate = () => {
    cg?.toggleOrientation();
    setSide(prevSide => them(prevSide)); 
    setHand(prevHand => [prevHand[1], prevHand[0], prevHand[3], prevHand[2]]); 
  }

  return (
    <div>
      <div className="flex">
        <div className="side-panel">
          <div className="navigation">
            <Button variant="contained" onClick={play}>Play</Button>
            <Button variant="contained">Analysis</Button>
            <Button variant="contained">Openings</Button>
            <Button variant="contained">Puzzles</Button>
          </div>
          <div className="footer">
              <Button variant="contained" onClick={resign}>Logout</Button>
            </div>
        </div>
          <div className="flex rounded-lg bg-white ml-60 mt-6 outline outline-2 outline-gray-300 shadow-lg select-none">
            <div className="main-board">
              <div className="top-container">
                <Clock timeLeft={times[0]} running={running[0]} updateTime={(newTime) => updateTime(0, newTime)}></Clock>
                <div className="pocket-container ml-6">                 
                  <Pocket color={them(side)} hand={hand[0]} small={false} cg={cg}></Pocket>
                </div>
              </div>
              <div className="glass rounded-lg shadow-xl">
                <div ref={ref} style={{ width: "657px", height: "657px" }}></div>
              </div>
              <div className="bottom-container">
                <div className="clock-container">
                  <Clock timeLeft={times[1]} running={running[1]} updateTime={(newTime) => updateTime(1, newTime)}></Clock>
                </div>
                <div className="pocket-container mr-8">
                  <Pocket color={side} hand={hand[1]} small={false} cg={cg}></Pocket>
                </div>
                <div className="controls-container select-none">
                  <button onClick={rotate}>
                    <Image src="/images/rotate.png" width={25} height={25} alt="Rotate"/>
                  </button>
                  <button onClick={rotate}>
                    <Image src="/images/settings.svg" width={25} height={25} alt="Settings"/>
                  </button>
                </div>
              </div>
            </div>
            <div className="partner-board">
              <div className="top-container"> 
                <Clock timeLeft={times[2]} running={running[2]} updateTime={(newTime) => updateTime(2, newTime)} ></Clock>
                <div className="pocket-container -translate-x-10">                 
                  <Pocket color={side} hand={hand[2]} small={true}></Pocket>
                </div>
              </div>
              <BoardComponent config={partnerConfig} /> 
              <div className="bottom-container">
                <Clock timeLeft={times[3]} running={running[3]} updateTime={(newTime) => updateTime(3, newTime)} ></Clock>
                <div className="pocket-container -translate-x-10">                 
                  <Pocket color={them(side)} hand={hand[3]} small={true}></Pocket>
                </div>
              </div>
              <div><Chat socket={socket}></Chat></div>
            </div>
        </div>
      </div>
    </div>
  );
}
