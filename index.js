require('dotenv').config();
var jsonEmbeds = require('./embeds.json');
var fs = require('fs');

const Discord = require('discord.js');
const client = new Discord.Client();


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setStatus('online');
    client.user.setPresence({
        game: {
            name: 'Chilling',
            status: "ONLINE",
            url: "https://discord.gg/UhAQa76"
        }
    });
});




//get the settings
var settingsLines = fs.readFileSync('.bot-settings').toString().split("\n");
var settings ={};
for (let i = 0; i < settingsLines.length; i++) {
    let extractedValues = settingsLines[i].split(/ +/);
    if(extractedValues[0] !== null && extractedValues[0] !== undefined && extractedValues[0].length > 1) {
        let valueString = '';
        let sliced = extractedValues.slice(1, extractedValues.length);
        sliced.forEach(function(item, index) {
            valueString += item + ' ';
        });
        settings[extractedValues[0]] = valueString.substr(0,valueString.length-2).replace('\\n', '\n');
    }
}
console.log(settings);

//make Discord embed objects from the embeds.json file
var discordEmbeds = {};
jsonEmbeds['content'].forEach(function(item, index) {
    discordEmbeds[item.name] = {'embed': jsonEmbeds['embeds'][item.name], 'access': item.access};
});


//set some templates
const aboutTemplate = new Discord.MessageEmbed()
    .setColor(settings.color)
    .setTitle(settings.description)
    .setAuthor('By ' + settings.author, settings.logo, settings.logo)
    .setDescription(settings.name + ' - V' + settings.version)
    .setThumbnail(settings.logo);


var userEnteredPass = '';
var rolePasswordLines = fs.readFileSync('.role-passwords').toString().split("\n");


//get the access roles and levels
var accessRolesLines = fs.readFileSync('.access-roles').toString().split("\n");
var accessRoles = {};
console.log("Reading in administrative roles...");
for (let i = 0; i < accessRolesLines.length; i++) {
    if(accessRolesLines[i].split(/ +/)[0].length > 1) {
        accessRoles[accessRolesLines[i].split(/ +/)[0]] = accessRolesLines[i].split(/ +/)[1];
    }
}
console.log(accessRoles);

//get the allowed channels
var allowedChannelLines = fs.readFileSync('.allowed-channels').toString().split("\n");
var allowedChannels = [];
console.log("Reading in allowed channels...");
for (let i = 0; i < allowedChannelLines.length; i++) {
    if(allowedChannelLines[i].split(/ +/)[0].length > 1) {
        allowedChannels[i] = allowedChannelLines[i].split(/ +/)[0];
        console.log("> " + (i + 1).toString() + " [" + allowedChannels[i] + "]");
    }
}

function getArguments(message){
    let splittedMessage = message.split(/ +/);
    let valueString = '';
    if(splittedMessage[1] !== null && splittedMessage[1] !== undefined && splittedMessage[1].length > 1) {
        let sliced = splittedMessage.slice(1, splittedMessage.length);
        sliced.forEach(function(item, index) {
            if(index + 2 === splittedMessage.length){
                valueString += item;
            } else {
                valueString += item + ' ';
            }
        });
        return valueString;
    }
}

function checkAccess(memberRoles, accessNeeded){
    //First get all access levels for this member by using the accesRoles dict object
    let memberAccesLevels = [];
    memberRoles.forEach(function (item, index) {
        if(accessRoles[item] !== undefined && accessRoles[item] !== null){
            memberAccesLevels.push(accessRoles[item])
        }
    });
    //Check if accessNeeded is an array of allowed access levels,
    //then check whether or not there's a match between the access needed and the memberAccesslevels
    if(accessNeeded instanceof Array){
        var foundMatch = false;
        accessNeeded.forEach(function (accessNeededItem, index) {
            if(memberAccesLevels.includes(accessNeededItem)){
                foundMatch = true
            }
        });
    } else {
        if(memberAccesLevels.includes(accessNeeded)){
            foundMatch = true
        }
    }
    return foundMatch;
}


function checkPassword(member){
    let parsedPass = member.content.split(/ +/)[1];
    for (let i = 0; i < rolePasswordLines.length; i++) {
        let pieces = rolePasswordLines[i].split(/ +/);
        let succesString = '\n';
        let sliced = pieces.slice(2, pieces.length);
        sliced.forEach(function(item, index) {
            succesString += item + ' ';
        });
        if (parsedPass === pieces[1]){
            let guild = client.guilds.resolve(settings.server);
            //console.log(guild.roles.resolve(pieces[0]));
            let parsedRole = guild.roles.resolve(pieces[0]);
            if(parsedRole !== undefined && parsedRole !== null) {
                const user = guild.members.resolve(member.author.id);
                if(user !== undefined && user !== null) {
                    //console.log(user.id);
                    user.roles.add(parsedRole).catch(err => {
                        return "Error: no rights"
                    });
                    succesString += "Role **" + parsedRole.name + "** acquired!";
                    return succesString;
                }
                return "Cannot find you as a member on the GM7 Server.\nPlease accept an invite at: https://discord.gg/UhAQa76"
            }
            return "Cannot find role :("
        }
    }
    return 'Not a valid password :(';
}

//DM's
client.on('message', member => {
    if (member.channel.type === 'dm' && !member.author.bot) { //Bot-commands-chat
        if (/^rpass\s([A-z0-9]{4,64})$/.test(member.content)) {
            member.reply(checkPassword(member)).catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        } else if(member.content === 'about') {
            member.reply("About me:\n**GM7 Discord Bot V0.1**\n10-03-2020\nAlexander Samson\nalexander@gm7.nl").catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        } else if(member.author.id !== '686699673724911682') {
            member.reply("I'm sorry, I'm not yet configured to parse that command!").catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        }
    }
});

//Chats
client.on('message', member => {
    if(
        member.member === null ||
        member.channel === undefined ||
        member.member === undefined ||
        member.content === null ||
        member.content === undefined ||
        member.content === '')
    {
            //Do nothing
    }
    else if ((!allowedChannels.includes(member.channel.id) && !checkAccess(member.member._roles, ['owner','administrator'])) || member.author.bot ) { //Bot-commands-chat
        if (member.content.startsWith(settings.prefix)){
            member.channel.send("You don't have permission to use bot commands in this channel");
        }
    }
    else{
        if (member.content === settings.prefix + 'ping') {
            member.reply('pong').catch(err => {
                console.log(err + settings.nonBreakingErrorMessage).catch(err => {
                    console.log(err + settings.nonBreakingErrorMessage)
                });
            });
        }
        else if (member.content === settings.prefix + 'about') {
            member.channel.send(discordEmbeds['info-about']).catch(err => {
                console.log(err + settings.nonBreakingErrorMessage).catch(err => {
                    console.log(err + settings.nonBreakingErrorMessage)
                });
            });
        }
        else if (member.content.startsWith(settings.prefix + 'loadembed ')) {
            if(discordEmbeds[getArguments(member.content)] === undefined){
                member.channel.send(jsonEmbeds.messages.cannotFindEmbed).catch(err => {
                    console.log(err + settings.nonBreakingErrorMessage)
                });
            }
            else if(checkAccess(member.member._roles, discordEmbeds[getArguments(member.content)].access)) {
                member.channel.send(discordEmbeds[getArguments(member.content)]).catch(err => {
                    member.channel.send(jsonEmbeds.messages.cannotFindEmbed);
                    console.log(err + settings.nonBreakingErrorMessage)
                });
            } else {
                member.channel.send(jsonEmbeds.messages.notEnoughAccess).catch(err => {
                    console.log(err + settings.nonBreakingErrorMessage)
                });
            }
        }else if (member.content.startsWith('m.')) {
            member.channel.send('*MEE6* does not support custom prefixes yet.\nPlease use **!' + member.content.substr(2) + '** for now.').catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        }else if (member.content.startsWith('u.')) {
            member.channel.send('*UpBeat* does not support custom prefixes yet.\nPlease use **!' + member.content.substr(2) + '** for now.').catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        } else if (member.content.startsWith(settings.prefix)) {
            member.channel.send('I don\'t know what you mean.').catch(err => {
                console.log(err + settings.nonBreakingErrorMessage)
            });
        }
    }
});

//Welcomer (DM)
client.on('guildMemberAdd', member => {
    member.send(
        'Have a great time here in **' + member.guild.name + '**.\n' +
        'If you leave and want to come back some day, use this invite link: ' + settings.inviteUrl +' 😀'
    )
});


//login
client.login(process.env.BOT_TOKEN);

