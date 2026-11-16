@echo off
title DFA String Processing Visualizer
echo Starting DFA String Processing Visualizer...
echo Opening in default web browser...
start "" "http://localhost:8000/index.html" 2>nul || start "" "%~dp0index.html"
python -m http.server 8000
pause

