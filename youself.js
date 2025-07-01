require('./system/config');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, makeInMemoryStore, jidDecode, proto } = require("@whiskeysockets/baileys");
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const chalk = require('chalk')
const readline = require("readline")
const axios = require('axios'); // Added for GitHub database
const { smsg, fetchJson, await, sleep } = require('./system/lib/myfunction');
//======================
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const usePairingCode = true

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (text) => {
  return new Promise((resolve) => {
    rl.question(text, resolve)
  })
}

//======================
async function StartZenn() {
const { state, saveCreds } = await useMultiFileAuthState('./session')
const conn = makeWASocket({
logger: pino({ level: "silent" }),
printQRInTerminal: !usePairingCode,
auth: state,
browser: [ "Ubuntu", "Chrome", "20.0.04" ]
});
//======================
if (usePairingCode && !conn.authState.creds.registered) {
    const password = await question(chalk.hex('#00CED1')(`\n[!] Masukkan Password Master:\n> `))
    const pw = 'sandhy' // Ganti dengan password master kamu
    if (password !== pw) {
        console.log(chalk.redBright.bold('\n[×] Password salah! Kemungkinan script ini hasil nyuri.'))
        process.exit()
    }

    try {
        console.log(chalk.hex("#DA70D6").bold('\n[?] Masukkan Nomor WhatsApp kamu (gunakan awalan 62):'))
        const phoneNumber = await question(chalk.hex('#00CED1')('> '))

        if (!phoneNumber?.trim()) {
            console.log(chalk.red('\n[×] Nomor tidak valid. Silakan coba lagi.'))
            return
        }

        const userName = await question(chalk.hex('#32CD32')('\n[+] Masukkan Nama Pengguna:\n> '))
        const userPass = await question(chalk.hex('#FFD700')(`\n[!] Masukkan Password untuk ${userName}:\n> `))

        const apiUrl = `https://raw.githubusercontent.com/SandyModss6/yagami-db/main/youself.json`
        const res = await axios.get(apiUrl)
        const db = res.data

        const akun = db.data?.find(entry =>
            entry.nomor === phoneNumber.trim() &&
            entry.nama.toLowerCase() === userName.trim().toLowerCase() &&
            entry.password === userPass
        )

        if (!akun) {
            console.log(chalk.redBright.bold('\n[×] Data tidak cocok! Nomor, nama, atau password salah.'))
            process.exit()
        }

        let code = await conn.requestPairingCode(phoneNumber.trim(), "YAGAMI27")
        code = code.match(/.{1,4}/g)?.join(" - ") || code

        console.log(chalk.hex("#32CD32").bold('\n[✓] Kode Pairing Kamu:'), chalk.yellow.bold(code))
        console.log(chalk.gray('\nSilakan scan kode tersebut di WhatsApp Web dengan akun kamu.'))

        rl.close() // Tutup readline setelah pairing selesai
    } catch (error) {
        console.log(chalk.red('\n[×] Terjadi kesalahan saat memproses nomor:'), chalk.redBright(error.message))
    }
}
conn.public = global.publik
//======================
conn.ev.on("connection.update", async (update) => {
const { connection, lastDisconnect } = update;
if (connection === "close") {
const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
const reconnect = () => StartZenn();
const reasons = {
[DisconnectReason.badSession]: "Bad Session, hapus session dan scan ulang!",
[DisconnectReason.connectionClosed]: "Koneksi tertutup, mencoba menghubungkan ulang...",
[DisconnectReason.connectionLost]: "Koneksi terputus dari server, menghubungkan ulang...",
[DisconnectReason.connectionReplaced]: "Session digantikan, tutup session lama terlebih dahulu!",
[DisconnectReason.loggedOut]: "Perangkat keluar, silakan scan ulang!",
[DisconnectReason.restartRequired]: "Restart diperlukan, memulai ulang...",
[DisconnectReason.timedOut]: "Koneksi timeout, menghubungkan ulang..."};
console.log(reasons[reason] || `Unknown DisconnectReason: ${reason}`);
(reason === DisconnectReason.badSession || reason === DisconnectReason.connectionReplaced) ? conn() : reconnect()}
if (connection === "open") {
      if (global.bot.newsletterJid)
        try {
    await conn.newsletterFollow(global.bot.newsletterJid);
  } catch (err) {
    console.log("Newsletter follow failed:", err.message || err);
  }
  console.log(chalk.red.bold("-[ WhatsApp Terhubung! ]"));
console.log(chalk.red.bold("-[ WhatsApp Terhubung! ]"));
}});
//==========================//
conn.ev.on("messages.upsert", async ({
messages,
type
}) => {
try {
const msg = messages[0] || messages[messages.length - 1]
if (type !== "notify") return
if (!msg?.message) return
if (msg.key && msg.key.remoteJid == "status@broadcast") return
const m = smsg(conn, msg, store)
require(`./system/yagami`)(conn, m, msg, store)
} catch (err) { console.log((err)); }})
//=========================//
conn.decodeJid = (jid) => {
if (!jid) return jid;
if (/:\d+@/gi.test(jid)) {
let decode = jidDecode(jid) || {};
return decode.user && decode.server && decode.user + '@' + decode.server || jid;
} else return jid;
};
//=========================//
conn.sendText = (jid, text, quoted = '', options) => conn.sendMessage(jid, { text: text, ...options }, { quoted });
conn.ev.on('contacts.update', update => {
for (let contact of update) {
let id = conn.decodeJid(contact.id);
if (store && store.contacts) {
store.contacts[id] = { id, name: contact.notify };
}
}
});
conn.ev.on('creds.update', saveCreds);
return conn;
}
//=============================//
console.log(chalk.green.bold(
`⠀⢀⡔⠝⠁⠀⠀⠀⠀⠀⠀⠀⠀⠐⠌⠂⢄⠀
⠀⠀⠀⠀⡠⢒⣾⠟⠀⠀⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠜⣷⠢⢴⡠⠤⠤⡀
⠀⠀⢀⣜⣴⣿⡏⠀⠀⠘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣷⡌⢃⠁⠀⠌
⠀⣰⣿⣿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠂⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣮⣧⢈⠄
⡾⠑⢜⢯⡛⡿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢋⠃⠿⡙⡝⢷⡀
⢾⣞⡌⣌⢡⠀⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠀⠀⠀⠀⢠⢘⡘⢸⢁⣟⣨⣿
⠀⠿⣿⣾⣼⣼⡇⠀⢠⠀⠀⠀⠀⠀⠀⠀⠀⣀⣧⠀⢸⠀⢸⣿⣷⣿⣿⡿⢻⠛
⠀⠀⢈⣿⡿⡏⠀⢠⠞⣶⣶⣦⡒⠄⠈⠀⠁⣡⣴⣦⣾⠇⠀⠀⠛⣟⠛⢃⠀⠀
⠀⠀⠌⣧⢻⠀⠀⠀⠢⣳⣯⠍⠈⠀⠀⠀⠀⠁⠯⠉⢗⡄⠀⠀⡀⢸⠢⡀⢢⠀
⠀⠘⢰⠃⣸⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠀⣷⣤⡑
⠀⡠⢃⣴⠏⠀⠀⠀⣆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡆⠀⠀⠀⠀⠀⣿⡗⠹
⠔⢀⡎⡇⠀⠀⡄⠀⢸⣦⡀⠀⠀⠀⠶⠿⡇⠀⠀⣠⣾⠁⠀⣴⠀⠀⢰⣿⠁⠀
⣠⣿⠁⡇⢰⠀⢰⠀⠈⣿⣿⡖⠤⣀⠀⠀⣀⢤⣾⢻⡿⠀⢠⠀⢠⠀⣿⡟⠀⠀
⣾⣿⠀⢃⠈⠀⠈⡄⢰⡸⢫⡇⠀⠀⠈⠉⠀⢸⠉⠺⡇⠀⡞⡄⣈⡀⣿⢁⠀⠀
⣿⣿⠀⠸⡄⢃⠄⣘⠸⡂⠪⣄⠀⠀⠀⠀⠀⠈⡄⡰⡃⢼⡧⠁⠛⢳⠧⠅⠈⠀⠀⠀
    ${chalk.red.bold("[ YAGAMI V1 ]")} 
────────────────────────────
    𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚛 : 𝚂𝚊𝚗𝚍𝚑𝚢𝙼𝚘𝚘𝚍𝚜
    𝚂𝚌𝚛𝚒𝚙𝚝 𝙽𝚊𝚖𝚎 : 𝚈𝚊𝚐𝚊𝚖𝚒 𝙲𝚛𝚊𝚜𝚑𝚎𝚛  
────────────────────────────`));
StartZenn()
//======================
