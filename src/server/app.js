 // Importar Express para el servidor web
import express from 'express'; 
 // Importar Morgan para el logging HTTP         
import logger from 'morgan';             
// Importar Socket.IO para la comunicación en tiempo real
import { Server } from 'socket.io';    
// Importar Node.js HTTP para crear el servidor  
import { createServer } from 'node:http';
// Importar cliente de base de datos @libsql/client
import { createClient } from '@libsql/client'; 
// Importar dotenv para cargar variables de entorno
import dotenv from 'dotenv';             

 // Cargar variables de entorno desde .env
dotenv.config();               

// Obtener el puerto del entorno o usar 3000 por defecto         
const port = process.env.PORT ?? 3000;  

//iniciando el servidor
const app = express();                  
const server = createServer(app);    
// Configurar Socket.IO en el servidor HTTP  
const io = new Server(server, {    
      // Opciones de recuperación de estado de conexión
  connectionStateRecovery: {}          
});

 // Configurar cliente de base de datos
const db = createClient({              
  url: 'libsql://wanted-dollar-juanpabloamm.turso.io', 
  authToken: process.env.DB_TOKEN       
});

// Crear tabla 'messages' si no existe
await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    user TEXT
  )
`);

// Manejar eventos de conexión con Socket.IO
io.on('connection', async (socket) => {
  console.log('a user has connected!');  // Registrar conexión de usuario

  // Manejar evento de desconexión
  socket.on('disconnect', () => {
    console.log('a user has disconnected'); // Registrar desconexión de usuario
  });

  // Manejar evento de mensaje de chat
  socket.on('chat message', async (msg) => {
    let result;
    const username = socket.handshake.auth.username ?? 'anonymous'; // Obtener nombre de usuario
    console.log({ username }); // Registrar nombre de usuario

    try {
      // Insertar mensaje en la base de datos
      result = await db.execute({
        sql: 'INSERT INTO messages (content, user) VALUES (:msg, :username)',
        args: { msg, username }
      });
    } catch (e) {
      console.error(e); // Manejar errores de inserción
      return;
    }

    // Emitir mensaje de chat a todos los clientes conectados
    io.emit('chat message', msg, result.lastInsertRowid.toString(), username);
  });

  // Recuperar mensajes para usuarios reconectados
  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT id, content, user FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      });

      // Enviar mensajes recuperados al usuario
      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.user);
      });
    } catch (e) {
      console.error(e); // Manejar errores al recuperar mensajes
    }
  }
});

// Configurar middleware de logging HTTP
app.use(logger('dev'));

// Ruta principal para servir archivo HTML estático
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + '/src/public/index.html');
});

// Iniciar el servidor HTTP en el puerto especificado
server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});
