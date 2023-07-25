const lib = require('lib')({token: process.env.STDLIB_SECRET_TOKEN});

await lib.discord.users['@0.1.5'].me.status.update({
  activity_name: `➺ ALSHAMI ★`, 
  activity_type: 'LISTENING',
  status: 'DND'
});