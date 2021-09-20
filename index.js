const Discord = require("discord.js");
const search = require("youtube-search");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});

client.on("message", async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        const args = message.content.split(" ");
        if (args[1])
        {
            if (args[1].startsWith("https://") || args[1].startsWith("http://"))
            {
                execute(message, serverQueue);
            }
            else
            {
                var q = "";
                args.forEach(element => {
                    if (element != "$play") q += element + " ";
                });
                console.log(q);

                search(q, opts, function(err, results) {
                    if(err) return console.log(err);
                    execute(results[0].url, serverQueue);
                });
            }
        }
        else
        {
            message.reply("No arguments given!");
        }
        return;
    } 
    else if (message.content.startsWith(`${prefix}skip`)) 
    {
        skip(message, serverQueue);
        return;
    } 
    else if (message.content.startsWith(`${prefix}stop`)) 
    {
        stop(message, serverQueue);
        return;
    } 
    else if (message.content.startsWith(`${prefix}queue`)) 
    {
        var queuetext = "Songs in queue: ";
        serverQueue.songs.forEach(song => {
            queuetext += "\n" + song.title;
        });
        message.reply(queuetext);
        return;
    }
    else 
    {
        message.reply("Not a valid command!");
    }
});

async function execute(message, serverQueue) {
    const args = message.content.split(" ");
    const vc = message.member.voice.channel;
    if (!vc)
    {
        return message.reply("You are not connected to a vc!");
    }
    const perms = vc.permissionsFor(message.client.user);
    if (!perms.has("CONNECT") || !perms.has("SPEAK")) {
        return message.channel.send("Missing permissions for this vc.");
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: vc,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };
        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);

        try {
            var connection = await vc.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } 
        catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } 
    else {
        serverQueue.songs.push(song);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply("Not connected to a vc!");
    if (!serverQueue)
        return message.channel.send("No songs in queue");
    message.channel.send("Song skipped.");

    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.reply("Not connected to a vc!");
        
    if (!serverQueue)
        return message.channel.send("Queue is already empty");
        
    serverQueue.songs = [];
    message.channel.send("Stopped playing.");
    serverQueue.connection.dispatcher.end();
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
        serverQueue.songs.shift();
        play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send("Now playing: " + song.title);
}

client.login(token);