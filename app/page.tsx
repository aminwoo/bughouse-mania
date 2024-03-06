'use client';

import { useEffect, useState, useCallback, useRef } from 'react'; 
import BoardComponent from './ui/boardComponent';
import io from 'socket.io-client';
import { Board, encode, decode } from './lib/board';
import { Config } from 'chessground/config';
import { Clock } from './ui/clock';
import { Button } from '@mui/material';
import { Chat } from './ui/chat';
import { Api } from 'chessground/api';
import { Chessground } from 'chessground';
import { Chess, Move, WHITE } from 'chess.js';
import { Pocket } from './ui/pocket';

import Image from 'next/image'

import "./page.css"

const socket = io('http://localhost:8080'); 

type Side = 'white' | 'black' | undefined;


export default function Home() {

  const [board] = useState<Board>(new Board()); 
  const [cg, setCg] = useState<Api>(); 
  const [config, setConfig] = useState<Config>({}); 
  const [partnerConfig, setPartnerConfig] = useState<Config>({movable: {free: false}});

  const [times, setTimes] = useState<number[]>([1800, 1800, 1800, 1800]);  
  const [running, setRunning] = useState<boolean[]>([false, false, false, false]); 

  let userside: Side;

  const them = (side: Side) => {
    return side === 'white' ? 'black' : 'white';
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
    const move = orig + dest; 
    socket.emit('message', `move ${encode(move)}`);
    board.play(move);

    updateRunning(0, true); 
    updateRunning(1, false);
  };

  const onPremove = (orig: string, dest: string) => {
    const move = orig + dest; 
    socket.emit('message', `premove ${encode(move)} false`);
  }
  
  const cancelPremoves = () => {
    socket.emit('message', `cancel`);
  }

  useEffect(() => {
    const messageHandler = (data : any) => {
      const args = data.toString().split(' ');
      if (args[0] === 'finished') {
        board.reset(); 
        setRunning([false, false, false, false]);
        userside = undefined;
      }
      else if (args[0] === 'userside') {
        if (userside !== args[1]) {
          userside = args[1]; 

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
      else if (args[0] === 'moves1') {
        const fen = board.doMoves(args[1], 0);
        if (fen !== null) {
          cg?.cancelPremove();
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
      else if (args[0] === 'moves2') {
        const fen = board.doMoves(args[1], 1);
        if (fen !== null) {
          setPartnerConfig(config => ({...config,
            fen: fen,
            lastMove: board.lastMove(1)
          }));
        }
      }
      else if (args[0] === 'times1') {
        const newTimes = args[1].split(',');
        if (userside === 'white') {
          setTimes(times => ([newTimes[1], newTimes[0], times[2], times[3]]));
        }
        else {
          setTimes(times => ([newTimes[0], newTimes[1], times[2], times[3]]));
        }
      }
      else if (args[0] === 'times2') {
        const newTimes = args[1].split(',');
        if (userside === 'white') {
          setTimes(times => ([times[0], times[1], newTimes[0], newTimes[1]]));
        }
        else {
          setTimes(times => ([times[0], times[1], newTimes[1], newTimes[0]]));
        }
      }

      if (userside && board.board[0].turn() === userside[0]) {
        updateRunning(0, false); 
        updateRunning(1, true); 
        updateRunning(2, false); 
        updateRunning(3, true); 
      }
      else {
        updateRunning(0, true); 
        updateRunning(1, false); 
        updateRunning(2, true); 
        updateRunning(3, false); 
      }
    }; 

    socket.on('message', messageHandler);

    return () => {
      socket.off('message', messageHandler);
    };
  }, [cg, config, board]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    //cg?.move('e7', 'e5');
      // for crazyhouse and board editors
    //cg?.newPiece({ color: 'black', role: 'queen'}, 'a3');
    //cg?.set({
    ////    movable: {
    //        dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
    //    },
    //});
    //board.board[0].load('rn1qkbnr/pP1bp1pp/5p2/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5');
    //cg.set({
    //  ...config,
    //  fen: 'rn1qkbnr/pP1bp1pp/5p2/8/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 5',
    //  movable: {
    //    dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
    //  },
    //});

    console.log(`Key pressed: ${event.key}`);

  }, [cg]);

  useEffect(() => {
    /*document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };*/
  }, [handleKeyPress]);

  function convertToDestsMap(moves : Move[]) {
    const dests = new Map();
    moves.forEach(move => {
        if (!dests.has(move.from)) {
            dests.set(move.from, []);
        }
        if (move.from === 'e1' && move.to === 'g1') {
          dests.get(move.from).push('h1');
        }
        if (move.from === 'e1' && move.to === 'c1') {
          dests.get(move.from).push('a1');
        }
        if (move.from === 'e8' && move.to === 'g8') {
          dests.get(move.from).push('h8');
        }
        if (move.from === 'e8' && move.to === 'c8') {
          dests.get(move.from).push('a8');
        }
        dests.get(move.from).push(move.to);
    });
    return dests;
  }

  const play = () => {
    socket.emit('message', 'seek');
  };

  const resign = () => {
    socket.emit('message', 'resign');
  };

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const config = {
        movable: {
          events: {
            after: (orig: string, dest: string) => {
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
              console.log(role, key); 
            }
          },
          free: false, 
          dests: convertToDestsMap(board.board[0].moves({ verbose: true })),
        },
        premovable: {
          enabled: true, 
          showDests: true, 
          events: {
              set: (orig:string , dest: string) => {
                onPremove(orig, dest); 
              },
              unset: () => {
                cancelPremoves(); 
              }
          }
        }
      };
      const cg = Chessground(ref.current, config);
      setCg(cg); 
      setConfig(config); 
    }
  },[]);

  const handleMouse = (event: React.MouseEvent<HTMLDivElement>) => {
    if (cg) {
        cg.dragNewPiece({ color: 'black', role: 'queen'}, event.nativeEvent as unknown as MouseEvent); 
    }
  };

  const rotate = () => {
    cg?.toggleOrientation();
  }

  return (
    <div>
      <div className="flex">
        <div className="side-panel">
          <div className='navigation'>
            <Button variant="contained" onClick={play}>Play</Button>
            <Button variant="contained">Analysis</Button>
            <Button variant="contained">Openings</Button>
            <Button variant="contained">Puzzles</Button>
          </div>
          <div className="footer">
              <Button variant="contained" onClick={resign}>Logout</Button>
            </div>
        </div>
          <div className="flex rounded-lg bg-white ml-60 mt-6 outline outline-2 outline-gray-300 shadow-lg">
            <div className="main-board">
              <div className="top-container">
                <Clock timeLeft={times[0]} running={running[0]} updateTime={(newTime) => updateTime(0, newTime)}></Clock>
                <div className="pocket-container ml-6">                 
                  <Pocket color="b" small={false}></Pocket>
                </div>
              </div>
              <div className="glass rounded-lg shadow-xl">
                <div ref={ref} style={{ width: '657px', height: '657px' }}></div>
              </div>
              <div className="bottom-container">
                <div className="clock-container">
                  <Clock timeLeft={times[1]} running={running[1]} updateTime={(newTime) => updateTime(1, newTime)}></Clock>
                </div>
                <div className="pocket-container mr-8">
                  <Pocket color="w" small={false}></Pocket>
                </div>
                <div className="controls-container">
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
                  <Pocket color="b" small={true}></Pocket>
                </div>
              </div>
              <BoardComponent config={partnerConfig} /> 
              <div className="bottom-container">
                <Clock timeLeft={times[3]} running={running[3]} updateTime={(newTime) => updateTime(3, newTime)} ></Clock>
                <div className="pocket-container -translate-x-10">                 
                  <Pocket color="w" small={true}></Pocket>
                </div>
              </div>
              <div><Chat socket={socket}></Chat></div>
            </div>
        </div>
      </div>


      <div onMouseDown={handleMouse} style={{ width: '30px', height: '30px', backgroundColor: 'yellow' }}>
        Q
      </div>

    </div>
  );
}
