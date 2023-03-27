#set terminal svg size 410,250 font 'Helvetica,9' enhanced rounded dashed
#set output 'plot.svg'

set terminal pngcairo size 8.6cm,14cm enhanced font 'Verdana,8' linewidth 1.5
set output 'plot.png'

set lmargin 5
set rmargin -1
set tmargin 3
set bmargin 2

# define axis
# remove border on top and right and set color to gray
set style line 101 lc rgb '#000000' lt 1
set border 0 back ls 101
set tics nomirror out front
# define grid
set style line 102 lc rgb '#808080' lt 1 lw 0.3
set grid front ls 102
#unset grid

# color definitions
#set style line 1 lc rgb '#8b1a0e' pt 1 ps 1 lt 1 lw 2 # --- red
#set style line 2 lc rgb '#5e9c36' pt 6 ps 1 lt 1 lw 2 # --- green

#load 'puor.pal'
#load 'spectral.pal'
#load 'paired.pal'
#load 'rdylbu.pal'
#load 'jet.pal'
load 'pal.pal'

#set key bottom right

#set title '1A5R'
set ylabel 'Residue number'
set xlabel 'Filtration cutoff (angstron)' offset 0,1
set cblabel 'Average curvature per residue' offset 0,0.8

set cbrange [-6.5:6.5]
set cbtics 1
set colorbox horizontal user origin 0.1,0.95 size 0.8,0.03

set ytics 10 offset 1,0
set xtics 0.5 offset 0,1
set format x "%.1f"
set format y "%.0f"

#set style rect fc lt -1 fs transparent solid 0.0 border lw 0.5

#set obj rect from 9,2.0 to 11,3.5 front
#set obj rect from 21,2.0 to 28,3.5 front
#set obj rect from 32,2.0 to 40,3.5 front
#set obj rect from 44,2.0 to 55,3.5 front
#set obj rect from 60,2.0 to 67,3.5 front
#set obj rect from 86,2.0 to 95,3.5 front

#set arrow from graph 0, first 2.5 to graph 1, first 2.5 nohead front lw 0.5
#set arrow from graph 0, first 3.0 to graph 1, first 3. nohead front lw 1.2

#set style fill  transparent solid 0.8 noborder
set pm3d map

set yrange [-2:102]
set xrange [1.3:4.0]

splot 'knill_per_residue_sorted.dat' u 3:2:5 w p pt 5 ps 0.1 lc palette t ''
