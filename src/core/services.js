const noop=()=>{};

export const services={blip:noop,puff:noop,hearts:noop,hint:noop,toast:noop,paintTools:noop,paintWishes:noop,closeLook:noop};

export function configureServices(implementations){ Object.assign(services,implementations); }
