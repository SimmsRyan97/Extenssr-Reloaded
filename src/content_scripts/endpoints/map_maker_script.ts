import EndpointScript from 'content/endpoints/content_script'
import { AbyssTag, ILogger } from 'logging/logging'
import LocationSaverMapMakerPlugin from 'content/plugins/map_maker/location_saver_map_maker_plugin'
import { Container, inject, injectable, interfaces } from 'inversify'
import config from '../../inversify.config'

@injectable()
export class MapMakerMapIdProvider {
    mapId = ''
}

/**
 * Handles everything that happens under /map-maker
 */

@injectable()
export default class MapMakerScript extends EndpointScript {
    public mapId: string | undefined

    constructor(
        @inject(config.BaseLogger) logger: ILogger,
    ) {
        super(logger, AbyssTag.MAP_MAKER_SCRIPT)
    }

    bindPlugins(bindFunc: interfaces.Bind): void {
        bindFunc<LocationSaverMapMakerPlugin>(config.LocationSaverMapMakerPlugin).to(LocationSaverMapMakerPlugin)
    }

    bindHelpers(bindFunc: interfaces.Bind): void {
        bindFunc<MapMakerMapIdProvider>(config.MapMakerMapIdProvider).to(MapMakerMapIdProvider).inSingletonScope()
    }

    protected initImpl(path: string, container: Container): void {
        const provider = container.get<MapMakerMapIdProvider>(config.MapMakerMapIdProvider)
        provider.mapId = path.split('/')[2]

        this.addPlugin(container.get<LocationSaverMapMakerPlugin>(config.LocationSaverMapMakerPlugin))
    }

    protected inferState(): 'none' {
        return 'none'
    }

    matches(path: string): boolean {
        return path.startsWith('/map-maker')
    }
}
