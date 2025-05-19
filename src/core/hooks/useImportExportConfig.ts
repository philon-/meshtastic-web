import { dump } from "js-yaml";
import { useCallback } from "react";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";

export interface GetYAMLConfigOptions {
  node: Protobuf.Mesh.NodeInfo;
  config: Protobuf.LocalOnly.LocalConfig;
  moduleConfig: Protobuf.LocalOnly.LocalModuleConfig;
}

// deno-lint-ignore no-explicit-any
type AnyObj = Record<string, any>;

interface EnumMapping {
  predicate: (path: string[]) => boolean;
  map: Record<number, string>;
}
const enumMappings: EnumMapping[] = [
  {
    predicate: (path) => path.join(".") === "config.device.role",
    map: Protobuf.Config.Config_DeviceConfig_Role,
  },
  {
    predicate: (path) => path.join(".") === "config.device.rebroadcastMode",
    map: Protobuf.Config.Config_DeviceConfig_RebroadcastMode,
  },
  {
    predicate: (path) => path.join(".") === "config.position.gpsMode",
    map: Protobuf.Config.Config_PositionConfig_GpsMode,
  },
  {
    predicate: (path) => path.join(".") === "config.network.addressMode",
    map: Protobuf.Config.Config_NetworkConfig_AddressMode,
  },
  {
    predicate: (path) => path.join(".") === "config.display.gpsFormat",
    map: Protobuf.Config.Config_DisplayConfig_GpsCoordinateFormat,
  },
  {
    predicate: (path) => path.join(".") === "config.display.units",
    map: Protobuf.Config.Config_DisplayConfig_DisplayUnits,
  },
  {
    predicate: (path) => path.join(".") === "config.display.oled",
    map: Protobuf.Config.Config_DisplayConfig_OledType,
  },
  {
    predicate: (path) => path.join(".") === "config.display.displaymode",
    map: Protobuf.Config.Config_DisplayConfig_DisplayMode,
  },
  {
    predicate: (path) => path.join(".") === "config.display.compassOrientation",
    map: Protobuf.Config.Config_DisplayConfig_CompassOrientation,
  },
  {
    predicate: (path) => path.join(".") === "config.lora.modemPreset",
    map: Protobuf.Config.Config_LoRaConfig_ModemPreset,
  },
  {
    predicate: (path) => path.join(".") === "config.lora.region",
    map: Protobuf.Config.Config_LoRaConfig_RegionCode,
  },
  {
    predicate: (path) => path.join(".") === "config.bluetooth.mode",
    map: Protobuf.Config.Config_BluetoothConfig_PairingMode,
  },

  {
    predicate: (path) =>
      path.join(".") === "module_config.detectionSensor.detectionTriggerType",
    map: Protobuf.ModuleConfig.ModuleConfig_DetectionSensorConfig_TriggerType,
  },
  {
    predicate: (path) => path.join(".") === "module_config.audio.bitrate",
    map: Protobuf.ModuleConfig.ModuleConfig_AudioConfig_Audio_Baud,
  },
  {
    predicate: (path) => path.join(".") === "module_config.serial.baud",
    map: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Baud,
  },
  {
    predicate: (path) => path.join(".") === "module_config.serial.mode",
    map: Protobuf.ModuleConfig.ModuleConfig_SerialConfig_Serial_Mode,
  },
  {
    predicate: (path) =>
      path.join(".") === "module_config.cannedMessage.inputbrokerEventCw",
    map: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
  },
  {
    predicate: (path) =>
      path.join(".") === "module_config.cannedMessage.inputbrokerEventCcw",
    map: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
  },
  {
    predicate: (path) =>
      path.join(".") === "module_config.cannedMessage.inputbrokerEventPress",
    map: Protobuf.ModuleConfig.ModuleConfig_CannedMessageConfig_InputEventChar,
  },
];

// There are several problematic types in Protobuf.LocalOnly.LocalConfig
// so we need to take a few extra steps before dumping the YAML
// - All keys are Uint8Array -> base64 encode as String and prepended with 'base64:'
// - All enums should be dumped as their key, eg. region: EU_868 and role: CLIENT
// - config.power.powermon is bigint -> use .toString()
// - Remove elements with keys '$typeName' and 'version'
function deepTransform<T>(
  input: T,
  path: string[] = [],
  // deno-lint-ignore no-explicit-any
): any {
  if (Array.isArray(input)) {
    return input.map((v, i) => deepTransform(v, [...path, String(i)]));
  }

  if (input instanceof Uint8Array) {
    return "base64:" + fromByteArray(input);
  }

  if (typeof input === "bigint") {
    return input.toString();
  }

  if (typeof input === "number") {
    for (const { predicate, map } of enumMappings) {
      if (predicate(path)) {
        const key = map[input];
        if (key !== undefined) return key;
      }
    }
    return input;
  }

  if (input !== null && typeof input === "object") {
    return Object.fromEntries(
      Object.entries(input as AnyObj)
        .filter(([k]) => k !== "$typeName" && k !== "version")
        .map(([k, v]) => {
          const transformed = deepTransform(v, [...path, k]);
          return [k, transformed];
        }),
    );
  }

  return input;
}

export function useImportExportConfig(): {
  getYAMLConfig: (opts: GetYAMLConfigOptions) => string | undefined;
} {
  const getYAMLConfig = useCallback(
    (
      { node, config, moduleConfig }: GetYAMLConfigOptions,
    ): string | undefined => {
      if (!node) return;

      // TODO: Channel URL
      // TODO: Fixed position

      const headerObj = {
        ...(node?.user?.longName && { owner: node.user?.longName }),
        ...(node?.user?.shortName && { owner_short: node.user?.shortName }),
        // channel_url
        // position
      };

      return dump(deepTransform({
        ...headerObj,
        config: config,
        module_config: moduleConfig,
      }));
    },
    [],
  );

  return { getYAMLConfig };
}
