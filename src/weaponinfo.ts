export type WeaponAnimationStyle = 'swing' | 'none';
export type WeaponRange = 'melee' | 'projectile';

export default class WeaponInfo {
  name: string;
  idleTextureName: string;
  actionTextureName: string;
  animationLength: number;
  animationStyle: WeaponAnimationStyle;
  actionSoundName: string;
  activationTime: number;
  viewScaleX: number;
  viewScaleY: number;
}

export const sword = new WeaponInfo();
sword.name = 'sword';
sword.idleTextureName = 'sword_v_idle';
sword.actionTextureName = 'sword_v_action';
sword.animationLength = 200;
sword.animationStyle = 'swing';
sword.actionSoundName = 'swing';
sword.activationTime = 100;
sword.viewScaleX = 0.5;
sword.viewScaleY = 2;

export const spellbook = new WeaponInfo();
spellbook.name = 'spellbook';
spellbook.idleTextureName = 'spellbook_v_idle';
spellbook.actionTextureName = 'spellbook_v_action';
spellbook.animationLength = 2500;
spellbook.animationStyle = 'none';
spellbook.activationTime = 2500;
spellbook.viewScaleX = 0.5;
spellbook.viewScaleY = 0.5;
spellbook.actionSoundName = 'fireball_channel';
