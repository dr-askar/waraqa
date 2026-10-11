const paths={
 documents:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 camera:'<path d="M8 5l1-2h6l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="4"/>',
 scan:'<path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M3 12h18M8 8h8M8 16h8"/>',
 star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 settings:'<path d="m9 3-.6 2-2 .9L4.4 5l-2 3.5L4 10v3l-1.6 1.5 2 3.5 2-.9 2 .9.6 2h6l.6-2 2-.9 2 .9 2-3.5L20 13v-3l1.6-1.5-2-3.5-2 .9-2-.9L15 3z"/><circle cx="12" cy="11.5" r="3"/>',
 moon:'<path d="M20.5 13a8.7 8.7 0 0 1-9.5-9.5A9 9 0 1 0 20.5 13z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 upload:'<path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/>',
 download:'<path d="M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',
 folder:'<path d="M3 7V4h6l2 3h10v13H3z"/>',
 grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
 list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 edit:'<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
 crop:'<path d="M6 3v15h15M3 6h15v15"/>',
 enhance:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5zM20 3v4m-2-2h4"/>',
 merge:'<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 12h8"/>',
 split:'<path d="M10 3H4v18h6m4-18h6v18h-6M12 2v3m0 3v3m0 3v3m0 3v2"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 text:'<path d="M4 5h16M12 5v15M8 20h8M4 3v4m16-4v4"/>',
 share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.5 10.5 7-4m-7 7 7 4"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 rotate:'<path d="M20 10a8 8 0 1 0-2 8M20 3v7h-7"/>',
 undo:'<path d="M3 10h11a6 6 0 0 1 0 12M3 10l6-6m-6 6 6 6"/>',
 redo:'<path d="M21 10H10a6 6 0 0 0 0 12m11-12-6-6m6 6-6 6"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',
 down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',
 restore:'<path d="M3 3v6h6M3 9a9 9 0 1 1 1 10M12 7v6l4 2"/>'
};
export const icon=name=>`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]||paths.documents}</svg>`;
export function decorateIcons(root=document){for(const element of root.querySelectorAll('[data-icon]'))if(!element.querySelector('.ui-icon'))element.insertAdjacentHTML('afterbegin',icon(element.dataset.icon));}
export function initUI(){
 decorateIcons();
 document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('.action-menu[open]'))if(!menu.contains(event.target)||event.target.closest('button'))menu.open=false;const quick=event.target.closest('[data-trigger]');if(quick)document.getElementById(quick.dataset.trigger)?.click();});
 document.addEventListener('toggle',event=>{if(event.target.matches?.('.action-menu[open]')){for(const menu of document.querySelectorAll('.action-menu[open]'))if(menu!==event.target)menu.open=false;const menu=event.target;menu.classList.remove('menu-up');requestAnimationFrame(()=>{if(menu.open){const panel=menu.querySelector('.menu-panel'),limit=innerHeight-(innerWidth<=700?100:15);if(panel.getBoundingClientRect().bottom>limit)menu.classList.add('menu-up');}});}},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=document.querySelector('.action-menu[open]');if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary').focus();}}});
}
