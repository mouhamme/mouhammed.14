const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const ytpl = require('ytpl');
const send = require('../tools/send.js');
const {getData, getPreview, getTracks} = require('spotify-url-info');

class Player {
  /**
   * Play Function
   */
  static async play(song, {channel_id, guild_id, direct, keyDetails} = {}) {
    if (song?.match(/^https?:\/\/(open.spotify.com|spotify.com)(.*)$/)) {
      if(song.includes('playlist') || song.includes('album')) return this.addPlaylist(song, {channel_id, guild_id, keyDetails});
      else if(song.includes('track')) song = await getData(song)
      .then(data => data?.name ? `${data.name} by ${data.artist} audio` : song)
    } else if (ytpl.validateID(song)) {
      return this.addPlaylist(song, {channel_id, guild_id, keyDetails});
    }
 
    if (!ytdl.validateURL(song))
      song = await yts(song).then((res) => {
        return res?.all[0]?.url || song;
      });

    if (ytpl.validateID(song))
      return this.addPlaylist(song, {channel_id, guild_id, keyDetails});

    let downloadInfo = await ytdl.getInfo(song);

    if (!keyDetails) {
      keyDetails = await lib.utils.kv['@0.1.16'].get({
        key: `${process.env.key}_${guild_id}`,
      });
    }
    
    let currentQueue =
    (await lib.utils.kv['@0.1.16'].get({
      key: `music_${process.env.key}_${guild_id}`,
      defaultValue: [],
    })) || [];

    let msg = await lib.discord.channels['@0.2.0'].messages.retrieve({
      message_id: keyDetails.messageId,
      channel_id: keyDetails.channelId,
    });

    if (!currentQueue.length || direct) {
      await lib.discord.voice['@0.0.1'].tracks.play({
        channel_id,
        guild_id,
        download_info: downloadInfo,
      });

      msg.embeds[0].title = downloadInfo.videoDetails.title;
      msg.embeds[0].url = downloadInfo.videoDetails.video_url;
      msg.embeds[0].image = {
        url: downloadInfo.videoDetails.thumbnails[
          downloadInfo.videoDetails.thumbnails.length - 1
        ].url,
      };

      msg.embeds[0].thumbnail = {
        url: downloadInfo.videoDetails.author.thumbnails[
          downloadInfo.videoDetails.author.thumbnails.length - 1
        ]?.url,
      };

      currentQueue = currentQueue.slice(1);

      await lib.discord.channels['@0.2.0'].messages.update({
        message_id: keyDetails.messageId,
        channel_id: keyDetails.channelId,
        embeds: msg.embeds,
        components: msg.components,
        content: `**[ Song List ]**\n${currentQueue
          .filter((x, i) => i <= 4)
          .map((x, i) => '**`[ ' + (i + 1) + ' ]`** ' + x.title)
          .join('\n')} ${
          currentQueue.length > 5
            ? '\n**' + (currentQueue.length - 5) + '** More Songs in queue..'
            : ''
        }`,
      });
    }

    if (!direct) await this.queue({guild_id, downloadInfo, keyDetails, msg});

    return downloadInfo;
  }

  static async addPlaylist(url, {channel_id, guild_id, keyDetails}) {
    let list = [];

    if (url.includes('spotify')) {
      list = await getTracks(url).then(
        (data) =>
          data?.map((x) => {
            return {
              title: x.name,
              shortUrl: `${x.name} by ${x.artists[0].name} audio`,
            };
          }) || []
      );
    } else {
      list = await ytpl(url, {limit: process.env.PLAYLIST_LIMIT || 20}).then(
        (res) => {
          return res.items;
        }
      );
    }

    let currentQueue = await lib.utils.kv['@0.1.16'].get({
      key: `music_${process.env.key}_${guild_id}`,
      defaultValue: [],
    });

    let playSong = currentQueue.length ? false : true;

    for (let item of list)
      currentQueue.push({
        url: item.shortUrl,
        title: item.title.replace(/"/g, "'"),
      });

    await lib.utils.kv['@0.1.16'].set({
      key: `music_${process.env.key}_${guild_id}`,
      value: currentQueue,
    });

    if (playSong)
      await this.play(list[0].shortUrl, {
        channel_id,
        guild_id,
        keyDetails,
        direct: true,
      });
    else {
      currentQueue = currentQueue.slice(1);

      let msg = await lib.discord.channels['@0.2.0'].messages.retrieve({
        message_id: keyDetails.messageId,
        channel_id: keyDetails.channelId,
      });

      await lib.discord.channels['@0.2.0'].messages.update({
        message_id: keyDetails.messageId,
        channel_id: keyDetails.channelId,
        components: msg.components,
        content: `**[ الإغنية الحالية ]**\n${currentQueue
          .filter((x, i) => i <= 4)
          .map((x, i) => '**`[ ' + (i + 1) + ' ]`** ' + x.title)
          .join('\n')} ${
          currentQueue.length > 5
            ? '\n**' + (currentQueue.length - 5) + '** More Songs in queue..'
            : ''
        }`,
      });
    }
  }

  /**
   * Queue Function
   */
  static async queue({guild_id, downloadInfo, keyDetails, msg}) {
    let currentQueue = await lib.utils.kv['@0.1.16'].get({
      key: `music_${process.env.key}_${guild_id}`,
      defaultValue: [],
    });

    currentQueue.push({
      url: downloadInfo.videoDetails.video_url,
      title: downloadInfo.videoDetails.title.replace(/"/g, "'"),
    });

    await lib.utils.kv['@0.1.16'].set({
      key: `music_${process.env.key}_${guild_id}`,
      value: currentQueue,
    });

    if (currentQueue.length > 1) {
      currentQueue = currentQueue.slice(1);
      await lib.discord.channels['@0.2.0'].messages.update({
        message_id: keyDetails.messageId,
        channel_id: keyDetails.channelId,
        components: msg.components,
        content: `**[ الإغنية الحالية ]**\n${currentQueue
          .filter((x, i) => i <= 4)
          .map((x, i) => '**`[ ' + (i + 1) + ' ]`** ' + x.title)
          .join('\n')} ${
          currentQueue.length > 5
            ? '\n**' + (currentQueue.length - 5) + '** More Songs in queue..'
            : ''
        }`,
      });
    }

    return currentQueue;
  }

  static async update({
    channel_id,
    guild_id,
    currentQueue,
    keyDetails,
    msg,
  } = {}) {
    keyDetails =
      keyDetails ||
      (await lib.utils.kv['@0.1.16'].get({
        key: `${process.env.key}_${guild_id}`,
      }));

    msg =
      msg ||
      (await lib.discord.channels['@0.2.0'].messages.retrieve({
        message_id: keyDetails.messageId,
        channel_id: keyDetails.channelId,
      }));

    currentQueue =
      currentQueue ||
      (await lib.utils.kv['@0.1.16'].get({
        key: `music_${process.env.key}_${guild_id}`,
        defaultValue: [],
      }));

    currentQueue = currentQueue.slice(1);

    await lib.discord.channels['@0.2.0'].messages.update({
      message_id: keyDetails.messageId,
      channel_id: keyDetails.channelId,
      embeds: msg.embeds,
      components: msg.components,
      content: `**[ الإغنية الحالية ]**\n${currentQueue
        .filter((x, i) => i <= 4)
        .map((x, i) => '**`[ ' + (i + 1) + ' ]`** ' + x.title)
        .join('\n')} ${
        currentQueue.length > 5
          ? '\n**' + (currentQueue.length - 5) + '** More Songs in queue..'
          : ''
      }`,
    });
  }

  /**
   * Reset Function (Reset the embed)
   */
  static async reset({channel_id, guild_id, keyDetails} = {}) {
    if (!keyDetails)
      keyDetails = await lib.utils.kv['@0.1.16'].get({
        key: `${process.env.key}_${guild_id}`,
      });

    await lib.utils.kv['@0.1.16'].clear({
      key: `voice_${process.env.key}_${guild_id}_loop`,
    });

    const embed = {
      title: `SAYAF ALSHAMI 😎`,
      url: `https://www.youtube.com/channel/UCQn16FpUM7nyIF6TQQuZ2gw`,
      description: `**افضل بوت ميوزك تم تطويره بواسطة الشامي كل ما عليك فقط قم بارسال اسم اغنية او رابط في هذا الشات**`,
      color: 0xd43790,
      image: {
        url: 'https://c.tenor.com/Wgo-XGZmUNAAAAAC/music-listening-to-music.gif',
      },
      thumbnail: {
        url: 'https://cdn.discordapp.com/attachments/1007315414826631233/1132536516439195648/18d9965192ad52245c5eb1b4364def95_2.jpg',
      },
    };

    await lib.discord.channels['@0.2.0'].messages.update({
      message_id: keyDetails.messageId,
      channel_id: keyDetails.channelId,
      embed,
      content: `**[ قائمة الأغاني ] انضم إلى روم صوتي واكتب اسم الأغنية أو الرابط هنا.**`,
      components: [
        {
          type: 1,
          components: [
            {
              style: 2,
              custom_id: `play_pause`,
              disabled: false,
              label: 'توقف تشغيل',
              type: 2,
            },
            {
              style: 2,
              label: 'توقف',
              custom_id: `stop`,
              disabled: false,
              type: 2,
            },
            {
              style: 2,
              label: 'تكرار',
              custom_id: `loop`,
              disabled: false,
              type: 2,
            },
            {
              style: 2,
              label: 'اصلاح',
              custom_id: `fix`,
              disabled: false,
              type: 2,
            },
            {
              style: 2,
              label: 'تخطي',
              custom_id: `skip`,
              disabled: false,
              type: 2,
            },
          ],
        },
      ],
    });
  }
}

module.exports = Player;
