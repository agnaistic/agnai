Set oWS = WScript.CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get current directory (where the .vbs lives)
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Create shortcut on desktop
Set oLink = oWS.CreateShortcut(oWS.SpecialFolders("Desktop") & "\Agnai.lnk")

oLink.TargetPath = currentDir & "\start.bat"
oLink.WorkingDirectory = currentDir
oLink.IconLocation = currentDir & "\web\asset\favicon.ico"
oLink.Arguments = "\fromShortcut"

oLink.Save