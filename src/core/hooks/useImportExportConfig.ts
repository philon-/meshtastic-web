import { dump, load } from "js-yaml";
import { useCallback } from "react";
import { Protobuf } from "@meshtastic/core";
import { fromByteArray, toByteArray } from "base64-js";
import { useDevice } from "@core/stores/deviceStore.ts";

export interface SetYAMLConfigOptions {
  yamlString: string;
}

type UnknownObj = Record<string, unknown>;

interface PartialConfig {
  config?: Partial<Protobuf.Config.Config>;
  module_config?: Partial<Protobuf.ModuleConfig.ModuleConfig>;
  [key: string]: unknown; //                                                                  TODO: can be typed stricter
}

interface EnumMapping {
  predicate: (path: string[]) => boolean;
  map: Record<number, string>;
}

const ENUMMAPPING: EnumMapping[] = [
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

const BIGINTPATHS = new Set([
  "config.power.powermonEnables",
]);

const invert = (m: Record<number, string>) =>
  Object.fromEntries(
    Object.entries(m).map(([num, key]) => [key, Number(num)]),
  ) as Record<string, number>;
const REVERSE_ENUMMAPPING = ENUMMAPPING.map((em) => ({
  ...em,
  reverseMap: invert(em.map),
}));

export function useImportExportConfig(): {
  getYAMLConfig: () => string | undefined;
  setYAMLConfig: (opts: SetYAMLConfigOptions) => boolean | undefined;
} {
  //const { setWorkingModuleConfig, setWorkingConfig } = useDevice();
  const { getMyNode, config, moduleConfig } = useDevice();
  const node = getMyNode();

  // There are several problematic types in Protobuf.LocalOnly.LocalConfig if we want
  // to adhere to the YAML "standard" introduced by the Python CLI,
  // so we need to take a few extra steps before dumping the YAML

  // - All keys are Uint8Array -> base64 encode as String and prepended with 'base64:'
  // - All enums should be dumped as their key, eg. 'region: EU_868' and NOT 'region: 4'
  // - config.power.powermon is bigint -> use .toString()
  // - Remove elements with keys '$typeName' and 'version'
  function deepTransform(
    input: unknown,
    path: string[] = [],
  ): unknown {
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
      for (const { predicate, map } of ENUMMAPPING) {
        if (predicate(path)) {
          const key = map[input];
          if (key !== undefined) return key;
        }
      }
      return input;
    }

    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as UnknownObj)
          .filter(([k]) => k !== "$typeName" && k !== "version")
          .map(([k, v]) => {
            const transformed = deepTransform(v, [...path, k]);
            return [k, transformed];
          }),
      );
    }

    return input;
  }

  function deepReverseTransform(
    input: unknown,
    path: string[] = [],
  ): unknown {
    if (Array.isArray(input)) {
      return input.map((v, i) => deepReverseTransform(v, [...path, String(i)]));
    }

    if (typeof input === "string" && input.startsWith("base64:")) {
      return toByteArray(input.slice("base64:".length));
    }

    const joined = path.join(".");
    if (typeof input === "string" && BIGINTPATHS.has(joined)) {
      return BigInt(input);
    }

    if (typeof input === "string" || typeof input === "number") {
      for (const { predicate, reverseMap } of REVERSE_ENUMMAPPING) {
        if (predicate(path) && reverseMap) {
          const maybeNum = reverseMap[input as string];
          if (maybeNum !== undefined) return maybeNum;
        }
      }
      return input;
    }

    if (input !== null && typeof input === "object") {
      return Object.fromEntries(
        Object.entries(input as UnknownObj)
          .map(([k, v]) => [k, deepReverseTransform(v, [...path, k])]),
      );
    }

    return input;
  }

  function validateByTemplate(
    template: unknown,
    candidate: unknown,
    path: string[] = [],
    errors: string[] = [],
  ): string[] {
    if (
      template === null || template === undefined ||
      path.at(-1) === "$typeName" || path.at(-1) === "version"
    ) {
      return errors;
    }

    const templateType = Array.isArray(template)
      ? "array"
      : template instanceof Uint8Array
      ? "uint8array"
      : typeof template;
    const candidateType = Array.isArray(candidate)
      ? "array"
      : candidate instanceof Uint8Array
      ? "uint8array"
      : typeof candidate;

    const keyPath = path.join(".");

    if (templateType !== candidateType) {
      errors.push(
        `Type mismatch at “${keyPath}”: expected ${templateType}, got ${candidateType}`,
      );
    }

    if (Array.isArray(template) && Array.isArray(candidate)) {
      const arrayTemplate = template;
      const arrayCandidate = candidate;
      if (arrayTemplate.length !== arrayCandidate.length) {
        errors.push(
          `Array length mismatch at “${keyPath}”: expected ${arrayTemplate.length}, got ${arrayCandidate.length}`,
        );
      }
      for (
        let i = 0;
        i < Math.min(arrayTemplate.length, arrayCandidate.length);
        i++
      ) {
        validateByTemplate(arrayTemplate[i], arrayCandidate[i], [
          ...path,
          String(i),
        ], errors);
      }
    }
    if (templateType === "object" && typeof candidate === "object") {
      Object.entries(candidate as UnknownObj).forEach(
        ([key, candVal]) => {
          const subTemplate = (template as UnknownObj)?.[key];
          if (subTemplate === undefined) {
            errors.push(
              `Unknown key “${keyPath}.${key}”`,
            );
          } else {
            validateByTemplate(
              subTemplate,
              candVal,
              [...path, key],
              errors,
            );
          }
        },
      );
    }
    return errors;
  }

  const getYAMLConfig = useCallback(
    (): string | undefined => {
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
    [deepTransform, node, config, moduleConfig],
  );

  const setYAMLConfig = useCallback(
    (
      { yamlString }: SetYAMLConfigOptions,
    ): boolean | undefined => {
      if (!yamlString) return;

      try {
        const rawConfig = load(yamlString);
        if (!rawConfig || typeof rawConfig !== "object") {
          console.error("YAML didn't parse into an object:", rawConfig);
          return false;
        }

        const transformedConfig = deepReverseTransform(
          rawConfig,
        ) as PartialConfig;
        if (!transformedConfig) {
          console.error("Reverse transform failed");
          return false;
        }
        const configErrors = validateByTemplate(
          config,
          transformedConfig.config,
        );

        const moduleConfigErrors = validateByTemplate(
          moduleConfig,
          transformedConfig.module_config!,
        );

        if (configErrors?.length) {
          console.error("Config shape/type errors:", configErrors);
          return false;
        }
        if (moduleConfigErrors?.length) {
          console.error("Module Config shape/type errors:", moduleConfigErrors);
          return false;
        }

        // TODO: Channel URL
        // TODO: Fixed position

        console.error("No errors");
        console.error(transformedConfig);
      } catch (e) {
        console.error("YAML parsing failed:", e);
        return false;
      }
    },
    [deepReverseTransform, config],
  );
  return { getYAMLConfig, setYAMLConfig };
}
