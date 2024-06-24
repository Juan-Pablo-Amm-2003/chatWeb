import express from 'express';
import logger from 'morgan';
import { Server } from 'socket.io';
import { createServer } from 'http';

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(logger('dev'));

app.get("/", (req, res) => {
    res.sendFile(process.cwd() + '/src/public/index.html');
});

io.on('connection', (socket) => {
    console.log("Usuario conectado");

    socket.on('disconnect', () => {
        console.log("Usuario desconectado");
    });

    socket.on('chat message', (msg) => {
        io.emit('chat message', msg); // Emitir el mensaje a todos los clientes
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
