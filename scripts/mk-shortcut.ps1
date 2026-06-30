 $ws = New-Object -ComObject WScript.Shell
 $sc = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\速记.lnk')
 $sc.TargetPath = 'E:\sidebar-notes\src-tauri\target\release\sidebar-notes.exe'
 $sc.WorkingDirectory = 'E:\sidebar-notes'
 $sc.Save()
 Write-Host 'desktop shortcut created'
