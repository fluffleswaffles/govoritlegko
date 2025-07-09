# СЕРВЕРНЫЕ ПРИКОЛЫ
### В ПЕРВУЮ ОЧЕРЕДЬ
`npm init -y` В ПАПКЕ server. ЭТО ВАЖНО ЧТОБЫ УСТАНОВИТЬ ПРИКОЛЫ!!!
дальше создай .env (если уже настроил postgresql), дальше установи все приколы для nodejs 
```
npm install express mongoose bcryptjs jsonwebtoken cors dotenv bcrypt
```

примерчик .env
```
DB_NAME=easy_speak_db
DB_USER=admin
DB_PASS=admin
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=ваш_секретный_ключ
ADMIN_SECRET=ваш_супер_секретный_ключ
PORT=5000
```
