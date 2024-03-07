"use client";

import Crunker from 'crunker';

export class SoundPlayer {
    constructor() {
        this.crunker = new Crunker(); 
        this.playing = false; 
    }

    isPlaying() {
        return this.playing;
    }

    async createBuffer(path) {
        this.buffer = (await this.crunker.fetchAudio(path))[0]; 
        return this.buffer; 
    }

    trimAudio(audioBuffer, threshold=0.02) {
        const sampleRate = audioBuffer.sampleRate; 
        const channels = audioBuffer.numberOfChannels;
        const channelData = audioBuffer.getChannelData(0); 
    
        let l = 0; 
        let r = 0; 
        for (let i = 0; i < channelData.length; i++) {
            if (channelData[i] > threshold) {
                if (l == 0) {
                    l = i;
                }
                r = i; 
            }
        }
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const newBuffer = audioContext.createBuffer(
            channels,
            r - l,
            sampleRate
        );

        const oldData = audioBuffer.getChannelData(0);
        const newData = newBuffer.getChannelData(0);
        for (let i = 0; i < r - l; i++) {
            newData[i] = oldData[i + l];
        }
        return newBuffer; 
    }

    play() {
        this.playing = true; 
        this.crunker.play(this.buffer);
    }

}