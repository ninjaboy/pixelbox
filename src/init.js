import ElementRegistry from './ElementRegistry.js';
import {
    EmptyElement,
    SandElement,
    WaterElement,
    StoneElement,
    FireElement,
    WoodElement,
    SteamElement,
    OilElement,
    SmokeElement,
    BurningWoodElement,
    TreeSeedElement,
    TreeTrunkElement,
    TreeBranchElement,
    LeafElement,
    GunpowderElement,
    FossilElement,
    AshElement,
    FishElement,
    WetSandElement,
    WallElement,
    WetGunpowderElement
} from './elements/index.js';

// Create and initialize the global element registry
const registry = new ElementRegistry();

// Register all base elements
registry.register(new EmptyElement());
registry.register(new SandElement());
registry.register(new WaterElement());
registry.register(new StoneElement());
registry.register(new FireElement());
registry.register(new WoodElement());
registry.register(new SteamElement());
registry.register(new OilElement());
registry.register(new SmokeElement());
registry.register(new BurningWoodElement());
registry.register(new TreeSeedElement());
registry.register(new TreeTrunkElement());
registry.register(new TreeBranchElement());
registry.register(new LeafElement());
registry.register(new GunpowderElement());
registry.register(new FossilElement());
registry.register(new AshElement());
registry.register(new FishElement());
registry.register(new WetSandElement());
registry.register(new WallElement());
registry.register(new WetGunpowderElement());

// Export the initialized registry
export default registry;
