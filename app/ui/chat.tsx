import React, { useEffect, ChangeEvent, useState, useRef } from 'react'
import TextField from '@material-ui/core/TextField';
import { createStyles, makeStyles, Theme } from "@material-ui/core/styles";
import SendIcon from '@material-ui/icons/Send';
import Button from '@material-ui/core/Button';
import { Socket } from 'socket.io-client';
import { Paper } from "@material-ui/core";
import { Message } from './message';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    wrapForm: {
        display: "flex",
        justifyContent: "center",
        width: "95%",
        margin: `${theme.spacing(0)} auto`
    },
    wrapText: {
        width: "100%"
    },
    button: {
        
    },
  })
);

interface ChatProps {
    socket: Socket; 
}

export const Chat: React.FC<ChatProps> = ({ socket }) => {
    const [messages, setMessages] = useState<string[]>([]); 
    const [text, setText] = useState(''); 
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const addMessage = (message: string) => {
        setMessages(prevMessages => [...prevMessages, message]);
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    useEffect(() => {
        const callback = (message: string) => addMessage(message); 
        socket.on('chat', callback);

        return () => {
            socket.off('chat', callback); 
        }
    }, [socket]);

    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value); 
    }

    const sendMessage = (event: any) => {
        event.preventDefault(); 
        socket.emit('chat', text);
        setText('');
    }

    const classes = useStyles();
    return (
        <div>
            <div className='message-container min-h-44 max-h-44 min-w-80 bg-slate-50 mt-6 overflow-y-auto select-none'>
                {messages.map(message => (<Message message={message}></Message>))}
                <div ref={messagesEndRef} />
            </div>
            <form className='flex mt-2' noValidate autoComplete="off" onSubmit={sendMessage}>
                <TextField
                    id="chat-input"
                    label="Type Message..."
                    className={classes.wrapText}
                    value={text}
                    onChange={handleTextChange}
                    
                />
                <Button variant="contained" color="primary" className='m-auto' style={{ fontSize: '0.75rem', padding: '6px 12px' }}  onClick={sendMessage}>
                    <SendIcon style={{ fontSize: '20px' }}/>
                </Button>
            </form>
        </div>
    )
}



