import { Plugin } from "@html_editor/plugin";
import { registry } from "@web/core/registry";

export class CTABadgeOptionPlugin extends Plugin {
    static id = "ctaBadgeOption";
    /** @type {import("plugins").BuilderResources} */
    resources = {
<<<<<<< f96eb75d5e02ce4a2ba20c90bc4fb8d95f798fce
        so_content_addition_selectors: [".s_cta_badge"],
||||||| 95943f7d2b7ad060a29bfb544dfc51ad4c18ceda
        builder_options: [CTABadgeOption],
        so_content_addition_selector: [".s_cta_badge"],
=======
        builder_options: [CTABadgeOption],
        so_content_addition_selector: [".s_cta_badge"],
        unsplittable_node_predicates: (node) => node.classList?.contains("s_cta_badge"),
>>>>>>> 373e92ddbc55de2fc105455fd04c533400f7b4a3
    };
}
registry.category("builder-plugins").add(CTABadgeOptionPlugin.id, CTABadgeOptionPlugin);
