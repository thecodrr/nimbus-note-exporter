# Nimbus Note Exporter

Nimbus Note recently removed the option (from their desktop clients) to bulk export your notes as HTML or PDF. This tool was created to bring that functionality back into the hands of the user.

> **Note:** This tool is in no way endorsed or affiliated with Nimbus Note or any of their subsidiaries. If you come across any issue while using this tool, you should create a bug report in this repository — NOT ON THEIR SUPPORT CHANNEL.

## Usage

### Installation

First make sure you have Node (v16+) & npm installed then run:

```
npm i -g nimbus-note-exporter
```

### Usage

After installation, you should have the `nimbus-note-exporter` in your PATH. There is nothing complex to it, just run:

```
nimbus-note-exporter
```

And you'll be prompted for your email & password. Your credentials are required for login to work.

> **Note:** You should not enter important credentials anywhere EXCEPT the official website. However, if you MUST then be CAREFUL and make sure your credentials aren't going anywhere you don't want.

## How it works?

This tool was created by reverse engineering Nimbus Note internal API used by their web clients. Expect this to break anytime.

## License

```
This file is part of the nimbus-note-exporter project

Copyright (C) 2023 Abdullah Atta

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```
