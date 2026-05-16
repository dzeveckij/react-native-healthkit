import {
  type ConfigPlugin,
  createRunOncePlugin,
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
  withPlugins,
} from '@expo/config-plugins'

import pkg from './package.json'

type BackgroundConfig = boolean

type InfoPlistConfig = {
  NSHealthShareUsageDescription?: string | true
  NSHealthUpdateUsageDescription?: string | true
  NSHealthClinicalHealthRecordsShareUsageDescription?: string | true
  NSHealthRequiredReadAuthorizationTypeIdentifiers?: string[]
}

type AppPluginConfig = InfoPlistConfig & {
  background?: BackgroundConfig
}

const withEntitlementsPlugin: ConfigPlugin<
  Pick<
    AppPluginConfig,
    'background' | 'NSHealthClinicalHealthRecordsShareUsageDescription'
  >
> = (config, props) => {
  return withEntitlementsPlist(config, (configPlist) => {
    configPlist.modResults['com.apple.developer.healthkit'] = true

    // background is enabled by default, but possible to opt-out from
    // (haven't seen any drawbacks from having it enabled)
    if (props?.background !== false) {
      configPlist.modResults[
        'com.apple.developer.healthkit.background-delivery'
      ] = true
    }

    if (props?.NSHealthClinicalHealthRecordsShareUsageDescription) {
      const existingAccess =
        configPlist.modResults['com.apple.developer.healthkit.access']
      const healthkitAccess = Array.isArray(existingAccess)
        ? existingAccess
        : []

      configPlist.modResults['com.apple.developer.healthkit.access'] = [
        ...new Set([...healthkitAccess, 'health-records']),
      ]
    }

    return configPlist
  })
}

const withInfoPlistPlugin: ConfigPlugin<InfoPlistConfig> = (config, props) => {
  return withInfoPlist(config, (configPlist) => {
    configPlist.modResults.NSHealthShareUsageDescription =
      typeof props?.NSHealthShareUsageDescription === 'string'
        ? props.NSHealthShareUsageDescription
        : `${config.name ?? pkg.name} wants to read your health data`

    // Add description if it's not undefined and not explicitly false

    configPlist.modResults.NSHealthUpdateUsageDescription =
      typeof props?.NSHealthUpdateUsageDescription === 'string'
        ? props.NSHealthUpdateUsageDescription
        : `${config.name ?? pkg.name} wants to update your health data`

    if (props?.NSHealthClinicalHealthRecordsShareUsageDescription) {
      configPlist.modResults.NSHealthClinicalHealthRecordsShareUsageDescription =
        typeof props.NSHealthClinicalHealthRecordsShareUsageDescription ===
        'string'
          ? props.NSHealthClinicalHealthRecordsShareUsageDescription
          : `${config.name ?? pkg.name} wants to read your clinical records`
    }

    if (props?.NSHealthRequiredReadAuthorizationTypeIdentifiers) {
      configPlist.modResults.NSHealthRequiredReadAuthorizationTypeIdentifiers =
        props.NSHealthRequiredReadAuthorizationTypeIdentifiers
    }

    return configPlist
  })
}

const withAppDelegatePlugin: ConfigPlugin<{
  background?: BackgroundConfig
}> = (config, props) => {
  if (props?.background === false) {
    return config
  }

  return withAppDelegate(config, (configDelegate) => {
    const contents = configDelegate.modResults.contents

    // Add import for HealthKit if not already present
    if (!contents.includes('import HealthKit')) {
      configDelegate.modResults.contents =
        configDelegate.modResults.contents.replace(
          /^(import .+\n)/m,
          '$1import HealthKit\n',
        )
    }

    const setupCall =
      '    BackgroundDeliveryManager.shared.setupBackgroundObservers()\n'

    if (
      !configDelegate.modResults.contents.includes('BackgroundDeliveryManager')
    ) {
      const bindCall = '    bindReactNativeFactory(factory)\n'
      if (configDelegate.modResults.contents.includes(bindCall)) {
        configDelegate.modResults.contents =
          configDelegate.modResults.contents.replace(
            bindCall,
            `${bindCall}${setupCall}`,
          )
      } else {
        configDelegate.modResults.contents =
          configDelegate.modResults.contents.replace(
            /(\n\s*return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\))/,
            `\n${setupCall}$1`,
          )
      }
    }

    return configDelegate
  })
}

const healthkitAppPlugin: ConfigPlugin<AppPluginConfig> = (config, props) => {
  return withPlugins(config, [
    [withEntitlementsPlugin, props],
    [withInfoPlistPlugin, props],
    [withAppDelegatePlugin, props],
  ])
}

export default createRunOncePlugin(healthkitAppPlugin, pkg.name, pkg.version)
