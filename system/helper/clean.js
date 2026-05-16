import util from 'util';

const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

const filterLogs = (args, originalFunction) => {
    // 1. Jika argumen pertama adalah objek besar (seperti sock), langsung loloskan tanpa filter
    // Ini memastikan console.log(sock) tidak terganggu logic filter string
    if (typeof args[0] === 'object' && args[0] !== null) {
        return originalFunction.apply(console, args);
    }

    // 2. Konversi argumen ke string untuk pengecekan filter
    const message = args.map(arg => typeof arg === 'string' ? arg : util.inspect(arg)).join(' ');

    // 3. Daftar Hitam (Hanya blokir jika pesan benar-benar sampah library)
    const noiseKeywords = [
        'Bad MAC',
        'verifyMAC',
        'libsignal',
        'SessionCipher',
        'Removing old closed session'
    ];

    if (noiseKeywords.some(key => message.includes(key))) {
        return; // Hentikan log sampah
    }

    // 4. Case khusus untuk notifikasi sistem (agar terminal tetap bersih)
    if (message.includes('Closing session:')) {
        if (message.includes('SessionEntry')) {
            originalConsoleInfo('\x1b[33m[SISTEM]\x1b[39m Memperbarui kunci enkripsi sesi...');
        }
        return; 
    }

    // Jalankan log normal
    originalFunction.apply(console, args);
};

console.log = (...args) => filterLogs(args, originalConsoleLog);
console.info = (...args) => filterLogs(args, originalConsoleInfo);
console.warn = (...args) => filterLogs(args, originalConsoleWarn);
console.error = (...args) => filterLogs(args, originalConsoleError);