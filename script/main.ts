import ko from 'knockout'
import {registerAll} from './compontents'
import {vm} from './interface';

// let keyCommands = {
//   46: (item) => item.delete && item.delete()
// };

// let keyUpHandler = (_, event: KeyboardEvent) => {
//   let action = keyCommands[event.keyCode];
//   if (action) {
//     action(selectedItem());
//   }
// }


export function main() {
  registerAll();
  window['vm'] = vm;
  ko.applyBindings(vm);
}
