# govoritlegko
### КАК ЗАВЕСТИ POSTGRESQL
короче чтобы завести базу установи postgresql. дальше ему надо инициализироваться через
```
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```
УМОЛЯЮ НЕ ЗАБУДЬ ИНАЧЕ НИЧЕ НЕ БУДЕТ РАБОТАТЬ

### НАСТРОЙКА POSTGRESQL
тут все очень просто но создай нормальные имя/пароль
```
CREATE USER admin WITH PASSWORD 'admin';
CREATE DATABASE easy_speak_db WITH OWNER admin;
GRANT ALL PRIVILEGES ON DATABASE easy_speak_db TO admin;
```

можешь по приколу еще настроить [pgAdmin](https://www.pgadmin.org/) но лучше через терминал
- запусти, установи мастер-пароль
- добавь сервер servers->register->server
- ну коннекшн и так понятно. хост либо локалхост либо сервак, порт 5432, дальше сам разберешься.
  
