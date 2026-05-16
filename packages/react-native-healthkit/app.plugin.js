const {
  withPlugins,
  createRunOncePlugin,
  withAppDelegate,
  withEntitlementsPlist,
  withInfoPlist,
} = require('@expo/config-plugins')

/**
 * @typedef ConfigPlugin
 * @type {import('@expo/config-plugins').ConfigPlugin<T>}
 * @template T = void
 */

/**
 * @typedef InfoPlistConfig
 * @type {{
 *  NSHealthShareUsageDescription?: string | boolean,
 *  NSHealthUpdateUsageDescription?: string | boolean,
 *  NSHealthClinicalHealthRecordsShareUsageDescription?: string | boolean,
 *  NSHealthRequiredReadAuthorizationTypeIdentifiers?: string[]
 * }}
 */

/**
 * @typedef AppPluginConfig
 * @type {InfoPlistConfig & { background?: boolean }}
 */

/**
 * @type {ConfigPlugin<{background: boolean}>}
 */
const withEntitlementsPlugin = (
  config,
  /**
   * @type {{background: boolean} | undefined}
   * */
  props,
) =>
  withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.healthkit'] = true

    // background is enabled by default, but possible to opt-out from
    // (haven't seen any drawbacks from having it enabled)
    if (props?.background !== false) {
      config.modResults['com.apple.developer.healthkit.background-delivery'] =
        true
    }

    if (props?.NSHealthClinicalHealthRecordsShareUsageDescription) {
      const existingAccess =
        config.modResults['com.apple.developer.healthkit.access']
      const healthkitAccess = Array.isArray(existingAccess)
        ? existingAccess
        : []

      config.modResults['com.apple.developer.healthkit.access'] = [
        ...new Set([...healthkitAccess, 'health-records']),
      ]
    }

    return config
  })

/**
 * @type {ConfigPlugin<InfoPlistConfig>}
 */
const withInfoPlistPlugin = (
  config,
  /**
   * @type {{NSHealthShareUsageDescription: string | true, NSHealthUpdateUsageDescription: string | true} | undefined}
   * */
  props,
) =>
  withInfoPlist(config, (config) => {
    config.modResults.NSHealthShareUsageDescription =
      typeof props?.NSHealthShareUsageDescription === 'string'
        ? props.NSHealthShareUsageDescription
        : `${config.name ?? pkg.name} wants to read your health data`

    config.modResults.NSHealthUpdateUsageDescription =
      typeof props?.NSHealthUpdateUsageDescription === 'string'
        ? props.NSHealthUpdateUsageDescription
        : `${config.name ?? pkg.name} wants to update your health data`

    if (props?.NSHealthClinicalHealthRecordsShareUsageDescription) {
      config.modResults.NSHealthClinicalHealthRecordsShareUsageDescription =
        typeof props.NSHealthClinicalHealthRecordsShareUsageDescription ===
        'string'
          ? props.NSHealthClinicalHealthRecordsShareUsageDescription
          : `${config.name ?? pkg.name} wants to read your clinical records`
    }

    if (props?.NSHealthRequiredReadAuthorizationTypeIdentifiers) {
      config.modResults.NSHealthRequiredReadAuthorizationTypeIdentifiers =
        props.NSHealthRequiredReadAuthorizationTypeIdentifiers
    }

    return config
  })

const pkg = require('./package.json')

/**
 * @type {ConfigPlugin<{background: boolean}>}
 */
const withAppDelegatePlugin = (
  config,
  /**
   * @type {{background: boolean} | undefined}
   * */
  props,
) => {
  if (props?.background === false) {
    return config
  }

  return withAppDelegate(config, (configDelegate) => {
    const contents = configDelegate.modResults.contents

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

/**
 * @type {ConfigPlugin<AppPluginConfig>}
 */
const healthkitAppPlugin = (config, props) =>
  withPlugins(config, [
    [withEntitlementsPlugin, props],
    [withInfoPlistPlugin, props],
    [withAppDelegatePlugin, props],
  ])

/**
 * @type {ConfigPlugin<AppPluginConfig>}
 */
module.exports = createRunOncePlugin(healthkitAppPlugin, pkg.name, pkg.version)
