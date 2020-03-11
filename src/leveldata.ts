export default [
  
  {
    enableFog: true,
    fogColor:  [0.4, 0.4, 0.4, 1.0],
    fogDensity: 0.01,
    floor: 'overgrown_dirt',
    wall: 'overgrown_wall',
    music: 'MUS_track0',
    text:
`
WWWWWWWWWWWWWWWW
W___________D__W
W____D___W_____W
W________D_____W
W_T__W_______D_W
W______B__D____W
W___________W__W
WP________T____W
W______________W
W_____W_____D__W
W_T____________W
W_______D______W
W______________W
W_____D_______EW
WWWWWWWWWWWWWWWW

`,
    items: [
      {type: 'sword', x: 3, y: 7},
      {type: 'spellbook', x: 3, y: 8},
    ]
  },
  
  {
    enableFog: true,
    fogColor:  [0.7, 0.7, 0.7, 1.0],
    fogDensity: 0.005,
    floor: 'overgrown_dirt',
    wall: 'overgrown_wall',
    music: 'MUS_track0',
    text:
`
__##############
____############
_______#########
_______#########
P______________E
_______WWW######
_______W_______#
____###W_T_____#
__#####________#
__##############
`,
    items: [
      {type: 'sword', x: 4, y: 4},
    ]
  },

  {
    enableFog: true,
    fogColor:  [0.1, 0.0, 0.0, 1.0],
    fogDensity: 0.05,
    floor: 'overgrown_dirt',
    wall: 'overgrown_wall',
    music: 'MUS_track2',
    text:
`
####__________#
####_##_#####_#
___#_##____D#_#
P__D_###_####_#
___#_###_###ED#
####_____######
`
  },

  {
    enableFog: true,
    fogColor:  [0.1, 0.0, 0.0, 1.0],
    fogDensity: 0.05,
    floor: 'overgrown_dirt',
    wall: 'overgrown_wall',
    music: 'MUS_track3',
    text:
`
##############
##########___#
#########E___#
##########___#
#####D##D###_#
P____________#
#####D##D#####
`,
    items: [
      {type: 'spellbook', x: 11, y: 2}
    ]
  },

  {
    enableFog: true,
    fogColor:  [0.1, 0.0, 0.0, 1.0],
    fogDensity: 0.05,
    floor: 'overgrown_dirt',
    wall: 'overgrown_wall',
    music: 'MUS_track3',
    text:
`
###D#D#D#D#D####
###__________###
__#____________#
P_______D____#D#
__#__________#D#
###D#D#D#D#D##E#
`
  },
];
