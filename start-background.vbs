Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "H:\Antigravity\New App"
WshShell.Run chr(34) & "H:\Antigravity\New App\start-server.bat" & Chr(34), 0, False
Set WshShell = Nothing
