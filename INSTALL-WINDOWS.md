# Install Farm City on Windows

This guide is for Windows 10 or Windows 11. You do not need Git. Unzip the project, install Node.js, connect a database, then start the shop in your browser.

You will type commands in **Command Prompt**. To open it: press the Windows key, type `cmd`, and press Enter.

Do every `cd` and `npm` command from the folder that contains this file (the unzipped `farm-city` folder). An example path is `C:\farm-city`. Yours may be `C:\Users\YourName\Downloads\farm-city`.

## 1. Unzip the project

1. Right-click `farm-city.zip` and choose **Extract All**.
2. Extract to `C:\` so the project lives at `C:\farm-city`.
3. You should see `package.json`, `client`, and `server` inside that folder.

Open Command Prompt and go there:

```bat
cd /d C:\farm-city
dir
```

`dir` should list `package.json`. If it says the path cannot be found, you unzipped somewhere else. Use that path in `cd` instead.

## 2. Install Node.js

1. Open https://nodejs.org and download the **LTS** Windows installer (version 22 or newer).
2. Run the installer. Leave **Add to PATH** checked. Accept the other defaults.
3. Close Command Prompt and open it again so Windows picks up Node.
4. Check the install:

```bat
node -v
npm -v
```

`node -v` should print `v22` or a higher number, for example `v22.14.0`. `npm -v` should print a version number, not an error.

If Windows says `node` is not recognized, the installer did not update PATH. Close every terminal window, open a new Command Prompt, and try again. If it still fails, restart the PC and try once more.

## 3. Choose a database

Checkout saves an order and its stock change together. That needs a MongoDB **replica set**. A normal single MongoDB install is not enough until you turn the replica set on, or you use MongoDB Atlas (which is already a replica set).

Pick **one** of the two options below.

### Option A — MongoDB on this PC

1. Open https://www.mongodb.com/try/download/community
2. Choose **Windows**, the current version, package **msi**.
3. Run the installer.
   - Choose **Complete**.
   - Leave **Install MongoDB as a Service** checked for now.
   - Install **MongoDB Shell** (mongosh) when the installer offers it. If it does not, download MongoDB Shell from the same site and install it too.
4. The Windows service starts MongoDB **without** a replica set. Farm City cannot check out until you stop that service and start MongoDB yourself.

Open **Command Prompt as Administrator** (right-click Command Prompt, then **Run as administrator**) and stop the service:

```bat
net stop MongoDB
```

If Windows says the service name was not found, the service may already be stopped. Continue.

Close the administrator window. In a normal Command Prompt:

```bat
cd /d C:\farm-city
start-mongo-windows.bat
```

That file creates `C:\data\db` and `C:\data\log`, starts MongoDB, and turns on replica set `rs0`.

You can do the same steps by hand if you prefer not to use the bat file. In one Command Prompt:

```bat
mkdir C:\data\db
mkdir C:\data\log
"C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --replSet rs0 --bind_ip 127.0.0.1 --port 27017 --dbpath C:\data\db --logpath C:\data\log\mongod.log
```

If your MongoDB folder is not `8.0`, open `C:\Program Files\MongoDB\Server` and use the version folder you see there.

Leave that window open. Open a **second** Command Prompt and run this once:

```bat
"C:\Program Files\MongoDB\Server\8.0\bin\mongosh.exe" --eval "rs.initiate({_id:'rs0', members:[{_id:0, host:'127.0.0.1:27017'}]})"
```

You want to see `{ ok: 1 }`. If it says the replica set is already initialized, that is also fine. You only initiate once for a data folder.

Keep the first window (the one running `mongod.exe`) open whenever you use the shop.

The default `server\.env` already points at this database:

```text
MONGODB_URI=mongodb://127.0.0.1:27017/farmcity?replicaSet=rs0
```

Do not remove `replicaSet=rs0`.

### Option B — Free MongoDB Atlas (nothing to install)

Use this if you would rather not install MongoDB.

1. Create a free account at https://www.mongodb.com/cloud/atlas/register
2. Create a free **M0** cluster. The provider and region can stay on the defaults.
3. Create a database user. Write down the username and password. If the password contains `@`, `#`, or `:`, change it to letters and numbers only so the connection string stays simple.
4. Under **Network Access**, add your current IP address, or `0.0.0.0/0` if you are on a home network and the IP keeps changing. `0.0.0.0/0` lets any network connect, which is acceptable for this local demo and not for a public production database.
5. Click **Connect**, choose **Drivers**, and copy the connection string. It looks like:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

6. Open `server\.env` in Notepad after you create it in the next section. Replace the `MONGODB_URI` line with your string, and put the database name `farmcity` before the `?`:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/farmcity?retryWrites=true&w=majority
```

Atlas clusters are already replica sets. Do not add `replicaSet=rs0` to an `mongodb+srv` address.

## 4. Create the env files

From `C:\farm-city` in Command Prompt:

```bat
copy server\.env.example server\.env
copy client\.env.example client\.env
```

If Windows asks `Overwrite?`, type `Y` only when you want to replace an env file you already edited.

In PowerShell the same step is:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

`server\.env` holds the database address and empty slots for Cloudinary, bKash, Nagad, and card payments. Leave those payment lines blank. Cash on delivery works without them. Do not put those secrets in `client\.env`. The client file only has `VITE_API_URL`, which stays empty on your PC.

## 5. Install, seed, and start

Still in `C:\farm-city`:

```bat
npm install
npm run seed
npm run dev
```

- `npm install` downloads the libraries. The first run can take a few minutes.
- `npm run seed` fills the database with fish, categories, delivery areas, and the demo accounts. Running it again replaces that demo data.
- `npm run dev` starts the API and the website. Leave this window open.

When it is ready you will see the API listening on port `4108` and Vite on port `4178`.

## 6. Open the shop

In a browser:

- Shop: http://127.0.0.1:4178
- API health check: http://127.0.0.1:4108/api/health

Demo logins (created by `npm run seed`):

| Who | Email | Password |
| --- | --- | --- |
| Shop admin | admin@farmcity.com | (set your own password when you seed; do not commit it) |
| Customer | customer@farmcity.com | (set your own password when you seed; do not commit it) |

The admin area is http://127.0.0.1:4178/admin after you sign in as the admin.

To stop the site, click the `npm run dev` window and press `Ctrl+C`. If you used local MongoDB, close the MongoDB window too, or press `Ctrl+C` there.

## 7. Troubleshooting

### `node` or `npm` is not recognized

Install Node.js LTS from https://nodejs.org, then close and reopen Command Prompt. `node -v` must be version 22 or newer. Farm City uses modern Node features (`node --watch` and top-level `await`). Node 18 will fail.

### Port 4108 or 4178 is already in use

Another copy of Farm City is still running. Close that Command Prompt, or find the program:

```bat
netstat -ano | findstr :4108
netstat -ano | findstr :4178
```

The last number on the line is the process id. Stop it:

```bat
taskkill /PID 12345 /F
```

Use the id you saw, not `12345`.

### Port 27017 is already in use

The MongoDB Windows service is still running as a normal standalone server. Farm City will connect and then fail at checkout. Stop the service in an **Administrator** Command Prompt:

```bat
net stop MongoDB
```

Then run `start-mongo-windows.bat` again.

### `Transaction numbers are only allowed on a replica set`

MongoDB is running, but not as a replica set. Stop it and start it with `--replSet rs0`, then run `rs.initiate` once, as in Option A. If you use Atlas, check that `MONGODB_URI` is the `mongodb+srv://...` string and includes `/farmcity` before the `?`.

### `connect ECONNREFUSED 127.0.0.1:27017`

Nothing is listening for MongoDB. Start `start-mongo-windows.bat` and leave its MongoDB window open. Or switch `MONGODB_URI` to Atlas.

### `npm run seed` cannot connect, or authentication failed

For Atlas, the username or password in `MONGODB_URI` does not match the database user, or Network Access is blocking your IP. Edit `server\.env`, save, and run `npm run seed` again.

### The shop opens but pictures or the API fail

`npm run dev` must still be running. Use http://127.0.0.1:4178 and not a `file://` address. Leave `VITE_API_URL` empty in `client\.env` so the site talks to the API on your PC.

### Cash on delivery is missing at checkout

In `server\.env`, do not turn cash on delivery off. Admin → Settings can also disable it. bKash, Nagad, and card payments stay hidden until their keys are filled in on the server. That is expected.
