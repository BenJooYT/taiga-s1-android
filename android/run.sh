#!/bin/bash
# Taiga-S1 on Android: Termux + Debian proot + FreeCAD 1.0 + torch CPU.
# Headless: bash run.sh tests | demo
# GUI (needs Termux:X11 app open): bash run.sh x11 | gui | guidemo | guistop
FCPY=/usr/lib/freecad-python3/lib:/usr/lib/freecad/lib:/usr/lib/freecad/Mod:/usr/share/freecad/Mod:/usr/share/freecad/Mod/Sketcher:/usr/share/freecad/Ext:/root/taiga-s1
FCLIB=/usr/lib/freecad-python3/lib:/usr/lib/freecad/lib
DEXP="export PYTHONPATH=${FCPY} LD_LIBRARY_PATH=${FCLIB} FREECAD_PYTHON=/usr/bin/python3 FREECAD_LIB=/usr/lib/freecad-python3/lib"
case "$1" in
  tests)
    proot-distro login debian12 -- bash -c "cd /root/taiga-s1 && ${DEXP} && /root/venv-taiga/bin/python -m pytest tests/ -q" ;;
  demo)
    proot-distro login debian12 -- bash -c "cd /root/taiga-s1 && ${DEXP} && /root/venv-taiga/bin/python /tmp/demo_build.py && cp /root/taiga-s1/demo_phone.FCStd /storage/emulated/0/Download/taiga_demo.FCStd" ;;
  x11)
    termux-wake-lock
    rm -f /data/data/com.termux/files/usr/tmp/.X11-unix/X0
    setsid nohup termux-x11 :0 > /data/data/com.termux/files/usr/tmp/x11.log 2>&1 < /dev/null &
    sleep 3
    python3 -c "import socket;s=socket.socket(socket.AF_UNIX);s.connect('/data/data/com.termux/files/usr/tmp/.X11-unix/X0');print('X11_ALIVE');s.close()"
    proot-distro login debian12 -- bash -c "mkdir -p /tmp/.X11-unix && ln -sf /data/data/com.termux/files/usr/tmp/.X11-unix/X0 /tmp/.X11-unix/X0 && echo LINK_OK" ;;
  gui)
    setsid nohup proot-distro login debian12 -- bash /root/fc-gui.sh > /data/data/com.termux/files/usr/tmp/fc-holder.log 2>&1 < /dev/null &
    echo "wait ~40s, then: proot-distro login debian12 -- bash -c \"cat /tmp/macro-marker.log\"" ;;
  guidemo)
    if [ -n "$2" ] && [ -f "$2" ]; then
      GOALJSON=$(basename "$2"); GNAME="$3"
      proot-distro login debian12 -- bash -c "cp /storage/emulated/0/projects/FreeCAD/${GOALJSON} /root/taiga-s1/${GOALJSON} && cd /root/taiga-s1 && ${DEXP} && /root/venv-taiga/bin/python scripts/gui_demo.py --model /root/taiga-s1/release/hf --goals ${GOALJSON} --name ${GNAME} --delay 0.4 --out runs/gui_demo && cp runs/gui_demo/${GNAME}.png runs/gui_demo/${GNAME}.FCStd /storage/emulated/0/Download/ 2>/dev/null; ls /storage/emulated/0/Download/${GNAME}.*"
    else
      proot-distro login debian12 -- bash -c "cd /root/taiga-s1 && ${DEXP} && /root/venv-taiga/bin/python scripts/gui_demo.py --model /root/taiga-s1/release/hf --level ${2:-3} --split iid --seed ${3:-7} --delay 0.4 --out runs/gui_demo && cp runs/gui_demo/L*.png runs/gui_demo/L*.FCStd /storage/emulated/0/Download/ 2>/dev/null; ls /storage/emulated/0/Download/taiga_gui_demo* /storage/emulated/0/Download/L* 2>/dev/null"
    fi ;;
  guistop)
    proot-distro login debian12 -- bash -c "pkill -f 'freecad /tmp/srv'" ; pkill -f 'termux-x11 :0'; echo STOPPED ;;
  *) echo "usage: bash run.sh tests|demo|x11|gui|guistop|guidemo [level] [seed]|guidemo <goals.json> <name>" ;;
esac
