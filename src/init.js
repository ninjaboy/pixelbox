import ElementRegistry from './ElementRegistry.js';
import {
    // === SPECIAL ===
    EmptyElement,
    PlayerElement,

    // === GASES (rise up) ===
    FireElement,
    SmokeElement,
    SteamElement,
    ElectricityElement,

    // === LIQUIDS (flow) ===
    WaterElement,
    OilElement,
    LavaElement,
    AcidElement,
    SlushElement,

    // === POWDERS (fall, form piles) ===
    SandElement,
    WetSandElement,
    GunpowderElement,
    WetGunpowderElement,
    AshElement,
    SnowElement,

    // === SOLIDS (static structures) ===
    StoneElement,
    WoodElement,
    IceElement,
    GlassElement,
    WallElement,
    ObsidianElement,
    CoalElement,
    FossilElement,

    // === ORGANIC (life & growth) ===
    TreeSeedElement,
    TreeTrunkElement,
    TreeBranchElement,
    LeafElement,
    VineElement,
    GrassSeedElement,
    FishElement,
    FishEggElement,
    CoralElement,
    HouseBuilderSeedElement,

    // === BURNING/TRANSFORMING ===
    BurningWoodElement,
    BurningCoalElement,

    // === ENVIRONMENTAL ===
    CloudElement,
    SteamVentElement
} from './elements/index.js';

// Create and initialize the global element registry
const registry = new ElementRegistry();

// === SPECIAL ===
registry.register(new EmptyElement());
registry.register(new PlayerElement());

// === GASES (rise up) ===
registry.register(new FireElement());
registry.register(new SmokeElement());
registry.register(new SteamElement());
registry.register(new ElectricityElement());

// === LIQUIDS (flow) ===
registry.register(new WaterElement());
registry.register(new OilElement());
registry.register(new LavaElement());
registry.register(new AcidElement());
registry.register(new SlushElement());

// === POWDERS (fall, form piles) ===
registry.register(new SandElement());
registry.register(new WetSandElement());
registry.register(new GunpowderElement());
registry.register(new WetGunpowderElement());
registry.register(new AshElement());
registry.register(new SnowElement());

// === SOLIDS (static structures) ===
registry.register(new StoneElement());
registry.register(new WoodElement());
registry.register(new IceElement());
registry.register(new GlassElement());
registry.register(new WallElement());
registry.register(new ObsidianElement());
registry.register(new CoalElement());
registry.register(new FossilElement());

// === ORGANIC (life & growth) ===
registry.register(new TreeSeedElement());
registry.register(new TreeTrunkElement());
registry.register(new TreeBranchElement());
registry.register(new LeafElement());
registry.register(new VineElement());
registry.register(new GrassSeedElement());
registry.register(new FishElement());
registry.register(new FishEggElement());
registry.register(new CoralElement());
registry.register(new HouseBuilderSeedElement());

// === BURNING/TRANSFORMING ===
registry.register(new BurningWoodElement());
registry.register(new BurningCoalElement());

// === ENVIRONMENTAL ===
registry.register(new CloudElement());
registry.register(new SteamVentElement());

// Export the initialized registry
export default registry;
