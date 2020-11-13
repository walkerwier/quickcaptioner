import {Observable, observable, observableArray, computed, pure, getAncestor} from './shortcuts'
import {components, bindingHandlers, applyBindingsToNode,
    applyBindingsToDescendants, isSubscribable, unwrap, dataFor} from 'knockout'


export class Component {
    static readonly template: string;
    params: object;
    constructor(params: object) {
        this.params = params;
    }
    static register(name: string) {
        components.register(name, {
            viewModel: (params) => new this(params),
            template: this.template
        });
    }
}

export class SimpleBinding<T> {
    value: T;
    element: HTMLElement;
    constructor (value: T, element: HTMLElement) {
        this.value = value;
        this.element = element;
    };
    getBindings(allBindings?: KnockoutAllBindingsAccessor) : object {
        return {};
    }
    isTarget(e: Event) {
        return (e.target == this.element);
    }
    static register(name: string) {
        let thisClass = this;
        bindingHandlers[name] = {
            init: function(element: Element, va: () => any, allBindings: KnockoutAllBindingsAccessor, vm, context) {
                let model = new thisClass(va(), element as HTMLElement);
                applyBindingsToNode(element, model.getBindings(allBindings), context);
            }
        }
    }
}

export class ContainerBinding<T> extends SimpleBinding<T> {
    static register(name: string) {
        let thisClass = this;
        bindingHandlers[name] = {
            init: function(element: Element, va: () => any, allBindings: KnockoutAllBindingsAccessor, vm, context) {
                let model = new thisClass(va(), element as HTMLElement);
                applyBindingsToNode(element, model.getBindings(allBindings), context);
                applyBindingsToDescendants(context, element);
            return { controlsDescendantBindings: true };
            }
        }
    }
}

//let componentsAndBindings: {new(): Component | SimpleBinding<any>}[] = [];

class ImageBinding extends SimpleBinding<File> {
    getBindings() {
        let dataUrl = observable();
        computed(() => {
            let reader = new FileReader();
            reader.onload = (e) => { dataUrl(reader.result); };
            reader.readAsDataURL(unwrap(this.value));
        });
        return {
            attr: {
                src: dataUrl
            }
        };
    }
}


bindingHandlers['toggleClass'] = {
    update: function (element: Element, valueAccessor: () => string|Observable<string>) {
        let oldval: string = '';
        let value = valueAccessor();
        if (isSubscribable(value)) {
            let update = (newVal) => {
                if (oldval === newVal) return;
                if (!oldval && newVal) {
                    element.classList.add(newVal);
                } else if (oldval && !newVal) {
                    element.classList.remove(oldval)
                } else if (oldval && newVal) {
                    if (element.classList.contains(oldval)) {
                        element.classList.replace(oldval, newVal);
                    } else {
                        element.classList.add(newVal);
                    }
                }
            }
            value.subscribe((val) => {oldval = val}, this, 'beforeChange');
            value.subscribe(update);
            update(value());
        } else {
            element.classList.add(value)
        }
    }
}


class Draggable extends SimpleBinding<string> {
    getBindings() {
        let value = this.value;
        return {
            event: {
                dragstart: (_, e: DragEvent) => {
                    e.dataTransfer.setData('text/plain', unwrap(value));
                    //e.preventDefault();
                    return true;
                }
            }
        };
    }
}

class DragTarget extends SimpleBinding<(files: File[]) => void> {
    hovering: Observable<boolean> = observable(false);
    getBindings(allBindings) {
        let items = allBindings.get('items')
        // let currentTarget: Element  = null;
        // let afterTarget: boolean = false;
        // let currentDrag = null;
        let hovering = this.hovering;
        let self = this;
        let dragStart = () => hovering(true);
        let dragStop = () => {
            hovering(false);
            // if (currentTarget) {
            //     currentTarget.classList.remove('insert-before', 'insert-after');
            // }
            // currentTarget = null;
            //currentDrag = null;
        };
        return {
            css: {
                'dragging': hovering,
                'droparea': true
            },
            event: {
                'dragover': (dummy: any, e: DragEvent) => {
                    e.preventDefault();
                    dragStart();
                    // let target = getAncestor(e.target as Element, '.section')
                    // if (!target) return;

                    // afterTarget = (e.offsetY > (target.offsetHeight / 2));
                    // let cls = afterTarget ? 'insert-after' : 'insert-before';
                    // if (currentTarget) {
                    //     currentTarget.classList.remove('insert-before', 'insert-after');
                    // }
                    // target.classList.add(cls);
                    // currentTarget = target;
                },
                'dragenter': (dummy: any, e: Event) => {
                    dragStart();
                },
                'dragleave': dragStop,
                'dragstart': (_, e: DragEvent) => {
                    // e.dataTransfer.setData('text/plain', 'data');
                    // currentDrag = dataFor(e.target as Element);
                    return true;
                },
                'mouseleave': dragStop,
                // 'drag': (_: any, e: Event) => {
                //     console.log('DD', e);
                // },
                'drop': (dummy: any, e: DragEvent) => {
                    e.preventDefault();
                    // let dragData = null;
                    // if (e.dataTransfer.getData('text/plain') == 'data') {
                    //     dragData = currentDrag;
                    // }
                    let index = -1;
                    // if (currentTarget) {
                    //     let item = dataFor(currentTarget);
                    //     index = items.indexOf(item) + afterTarget;
                    // }
                    dragStop();
                    // if (dragData) {
                    //     // reorder
                    //     let innerList = items();
                    //     innerList.splice(innerList.indexOf(dragData), 1);
                    //     innerList.splice(index, 0, dragData);
                    //     items(innerList);
                    // }
                    let files: File[] = [];
                    let dtItems = e.dataTransfer.items;
                    if (dtItems) {
                        for (let i = 0; i < dtItems.length; i++) {
                            const item = dtItems[i];
                            if (item.kind === 'file') files.push(item.getAsFile())
                        }
                    } else {
                        let items = e.dataTransfer.files;
                        for (let i = 0; i < items.length; i++) {
                            files.push(items[i])
                        }
                    }
                    this.value(files);
                }
            } 
        };
    }
}

bindingHandlers['render'] = {
    init: function(element: Element, va, allBindings, vm, bindingContext) {
        let template = va();
        let currentTemplate = unwrap(template);
        element.innerHTML = currentTemplate;
        if (isSubscribable(template)) {
            template.subscribe((val) => {
                element.innerHTML = val;
            })
        }
        applyBindingsToDescendants(bindingContext, element);
        return { controlsDescendantBindings: true };
    }
}

export function registerAll() {
    DragTarget.register('dropzoneFor');
    ImageBinding.register('image');
    Draggable.register('draggable');
}