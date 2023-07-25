const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});
const Player = require('../../../../helper/player.js');
const send = require('../../../../tools/send.js')
const message = context.params.event;
const keyDetails = await lib.utils.kv['@0.1.16'].get({
  key: `${process.env.key}_${message.guild_id}`,
});

if (message.content.startsWith('!setup')) {
  let channelId = message.content.match(/\d+/g);
  if (!channelId)
    return lib.discord.channels['@0.2.0'].messages.create({
      content: `**يرجى منشن القناة التي تريد إعداد او تثبيت بوت الموسيقى فيها.**`,
      channel_id: message.channel_id,
    });
  else channelId = channelId[0];

  const msg = await lib.discord.channels['@0.2.0'].messages.create({
    content: `**[ قائمة الأغاني ] انضم إلى روم صوتي واكتب اسم الأغنية أو الرابط هنا.**`,
    channel_id: channelId,
    embed: {
      title: `SAYAF ALSHAMI 😎`,
      url: `https://www.youtube.com/channel/UCQn16FpUM7nyIF6TQQuZ2gw`,
      description: `**افضل بوت ميوزك تم تطويره بواسطة الشامي كل ما عليك فقط قم بارسال اسم اغنية او رابط في هذا الشات**`,
      color: 0xD43790,
      image: {
        url: 'https://c.tenor.com/Wgo-XGZmUNAAAAAC/music-listening-to-music.gif',
      },
      thumbnail: {
        url: 'https://cdn.discordapp.com/attachments/1007315414826631233/1132536516439195648/18d9965192ad52245c5eb1b4364def95_2.jpg',
      },
    },
  });

  await Player.reset({keyDetails: {channelId, messageId: msg.id}});

  await lib.utils.kv['@0.1.16'].set({
    key: `${process.env.key}_${message.guild_id}`,
    value: {channelId, messageId: msg.id},
  });

  await lib.discord.channels['@0.2.0'].messages.create({
    content: `**تم الاتصال بالروم**`,
    channel_id: message.channel_id,
  });
} else if (keyDetails && keyDetails.channelId === message.channel_id) {
  const voice_channel = await lib.utils.kv['@0.1.16'].get({
    key: `voice_${process.env.key}_${message.guild_id}_${message.author.id}`,
  });

  await lib.discord.channels['@0.2.0'].messages.destroy({
    message_id: message.id, // required
    channel_id: message.channel_id, // required
  });

  if (!voice_channel)
    return send("**يرجى الانضمام إلى قناة صوتية أولاً!**", { channel_id: context.params.event.channel_id })

  await Player.play(message.content, {
    channel_id: voice_channel.channelId,
    guild_id: message.guild_id,
    keyDetails,
  }).catch(async (err) => {
    console.log(err)
    await send("**تعذر تشغيل الأغنية ، يرجى المحاولة مرة أخرى لاحقًا.**", { channel_id: context.params.event.channel_id })
  });
}







