require('dotenv').config()
const Discord = require('discord.js')
const noelle = new Discord.Client()
const mongoose = require('mongoose')
const fetch = require('node-fetch')
const cron = require('cron').CronJob
const Canvas = require('canvas')
Canvas.registerFont('./fonts/Uni Sans Regular.ttf', { family: 'Uni Sans Regular' })

const AtarashiNakama = require('./schemas/atarashi')

mongoose.connect(process.env.AkashicRecords, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useFindAndModify: false
}).catch(console.log)

const applyText = (canvas, text) => {
	const context = canvas.getContext('2d')
	let fontSize = 70;

	do {
		context.font = `${fontSize -= 10}px Uni Sans Regular`;
	} while (context.measureText(text).width > canvas.width - 375)

	return context.font;
}

const db = mongoose.connection
db.on('error', e => console.log({ message: e.message }))
db.on('open', async () => {
  const datenow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })
  console.log(`Connected to noelle's data sets\nDate: ${datenow}`)
})

const atarashi = AtarashiNakama.watch([], {
    fullDocument: `updateLookup`
})

atarashi.on("change", async next => {
    // process any change event
    try{
        if(next.operationType !== `insert` && next.operationType !== `update`) return 
        if(next.operationType === `update` && !next.updateDescription.updatedFields?.isSupport?.member) return
        const atarashi = next?.fullDocument ?? false

        if(!atarashi) return

        const user = noelle.users.cache.get(atarashi.discord.id)
        const GUILD = noelle.guilds.cache.get('848169570954641438')

        const random = Math.floor(Math.random() * 19) + 1

        const canvas = Canvas.createCanvas(1100, 500)
        const context = canvas.getContext('2d')
        const background = await Canvas.loadImage(`./cards/${random}.jpg`)

        const adjusted_width = canvas.width
        const adjusted_height = (canvas.width / background.width) * background.height

        context.drawImage(background, 0, -Math.abs(canvas.height - adjusted_height), adjusted_width, adjusted_height)

        const avatar = await Canvas.loadImage(user.displayAvatarURL({ format: 'png', size: 256, dynamic: true }))

        const x = 30
        const y = (canvas.height/2)-(avatar.height/2)
        const size = Math.min(avatar.width, avatar.height)

        context.font = applyText(canvas, user.tag)
        context.fillStyle = 'white'
        
        const text_size = context.measureText(user.tag)
        const text_height = text_size.actualBoundingBoxAscent + text_size.actualBoundingBoxDescent
        const text_x = 25 + x + avatar.width
        const text_y = ((canvas.height/2)-(text_height/2))+20
        context.strokeStyle = '#38363d'
        context.lineWidth = 5
        context.strokeText(user.tag, text_x, text_y)
        context.fillText(user.tag, text_x, text_y)

        context.font = `20px Uni Sans Regular`
        context.fillStyle = 'white'
        const discordText = context.measureText(`Discord ID: ${user.id}`)
        const discordText_height = discordText.actualBoundingBoxAscent + discordText.actualBoundingBoxDescent
        context.strokeStyle = '#38363d'
        context.lineWidth = 3
        context.strokeText(`Discord ID: ${user.id}`, text_x, text_y + text_height)
        context.fillText(`Discord ID: ${user.id}`, text_x, text_y + text_height)
        context.strokeText(`αℓтяια Key: ${atarashi.user.id}`, text_x, text_y + text_height+discordText_height+10)
        context.fillText(`αℓтяια Key: ${atarashi.user.id}`, text_x, text_y + text_height+discordText_height+10)

        context.beginPath()
        context.arc(x + (avatar.width/2), y + (avatar.height/2), size * 0.5, 0, 2 * Math.PI)
        context.closePath()
        context.clip()
        context.drawImage(avatar, x, y, avatar.width, avatar.height)

        context.beginPath()
        context.arc(x + (avatar.width/2), y + (avatar.height/2), size * 0.5, 0, 2 * Math.PI)
        context.strokeStyle = 'white'
        context.lineWidth = 10
        context.stroke()
        context.closePath()

        const attachment = new Discord.MessageAttachment(canvas.toBuffer(), `welcome-${user.username}.png`)

        const welcome_channel = next.operationType === `update` && next.updateDescription.updatedFields?.isSupport?.member ? `959999572384550932` : `870747129499500595`
        const role_assign = next.operationType === `update` && next.updateDescription.updatedFields?.isSupport?.member ? `<#960002414382035005>` : `<#870934841263288330>`
        await GUILD.channels.cache.get(welcome_channel).send({
            content: `Hi ${user.toString()}, welcome to the **${GUILD.name}** server.\nWe're so glad to have you here. Be sure to check out the ${role_assign}, and please, Enjoy your stay.`,
            files: [attachment] 
        }).then(msg => {
            msg.react('👋')
        })
    } catch(e){
        console.log(e)
        await noelle.users.cache.get('851062978416869377').send({ content: `Failed to welcome users: \`\`\`${e}\`\`\`` })
    }
})

noelle.once('ready', async () => {
//   noelle.user.setPresence(
//     { 
//       activity: { 
//         name: 'your orders~', //▶︎Henceforth
//         type: 'LISTENING',
//       },
//       status: 'online'
//     }
//   )

  // await AxieInfinitySlashCommands(noelle)
  // console.log(await noelle.api.applications(noelle.user.id).commands.get())
})

const resetStatus = new cron('* */10 * * * *', async () => {
    try {
        if(noelle.user?.presence.activities.length > 0) return

        noelle.user.setPresence(
            { 
            activity: { 
                name: 'your orders~', //▶︎Henceforth
                type: 'LISTENING',
            },
                status: 'online'
            }
        )
        console.log(`Status Reset: ${resetStatus.lastDate().toLocaleString()}`)
    } catch(e) {
        console.log(`Date: ${resetStatus.lastDate().toLocaleString()}`)
    }
}, null, true, 'Asia/Manila')

noelle.once('reconnecting', () => {
  console.log('Reconnecting!')
})

noelle.once('disconnect', () => {
  console.log('Disconnect!')
})

// noelle.on('message', async msg => {
//   if(msg.content == `send`){
//     const saveUser = new AtarashiNakama({
//       discord: {
//         id: msg.author.id
//       }
//     })

//     if(await saveUser.save()){
//       console.log(`saved`)
//     }
//   }
// })

noelle.login(process.env.Noelle)