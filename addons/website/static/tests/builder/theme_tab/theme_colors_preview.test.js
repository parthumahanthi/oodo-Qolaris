import { expect, getFixture, test } from "@odoo/hoot";
import { animationFrame, queryAll, waitFor, waitForNone } from "@odoo/hoot-dom";
import {
    defineWebsiteModels,
    setupWebsiteBuilder,
} from "@website/../tests/builder/website_helpers";
import { contains, allowTranslations, onRpc } from "@web/../tests/web_test_helpers";
import { markLowContrastElements } from "@website/builder/plugins/theme/theme_colors_preview_dialog";
import { parseHTML } from "@html_editor/utils/html";

defineWebsiteModels();

test("theme colors preview modal", async () => {
    await setupWebsiteBuilder("");

    await contains(".o_hb_snippets_tabs button[data-name=theme]").click();
    await contains(".o_hb_tab_content .o_hb_theme_color_slider_btn").click();
    await contains(".o_theme_tab button[title='Colors preview']").click();
    await animationFrame();
    expect(".o_theme_colors_preview_dialog iframe").toHaveCount(1);
    expect(".o_theme_tab button[title='Colors preview']").toHaveAttribute(
        "data-icon",
        "visibility_off"
    );

    await contains(".o_theme_colors_preview_dialog .modal-header .btn-close").click();
    await waitForNone(".o_theme_colors_preview_dialog");
    expect(".o_theme_tab button[title='Colors preview']").toHaveAttribute(
        "data-icon",
        "visibility"
    );

    await contains(".o_theme_tab button[title='Colors preview']").click();
    await animationFrame();
    expect(".o_theme_colors_preview_dialog iframe").toHaveCount(1);

    await contains(".o_theme_tab button[title='Colors preview']").click();
    await waitForNone(".o_theme_colors_preview_dialog");
    expect(".o_theme_tab button[title='Colors preview']").toHaveAttribute(
        "data-icon",
        "visibility"
    );

    await contains(".o_theme_tab button[title='Colors preview']").click();
    await animationFrame();
    expect(".o_theme_colors_preview_dialog iframe").toHaveCount(1);

    await contains(".o_hb_sliding_panel_label button[aria-label='close']").click();
    await waitForNone(".o_theme_colors_preview_dialog");

    await contains(".o_hb_tab_content .o_hb_theme_color_slider_btn").click();
    await contains(".o_theme_tab button[title='Colors preview']").click();
    await animationFrame();
    expect(".o_theme_colors_preview_dialog iframe").toHaveCount(1);

    await contains(".o_hb_snippets_tabs button[data-name=blocks]").click();
    await waitForNone(".o_theme_colors_preview_dialog");
});

test("theme colors preview marks low contrast again once bundles are reloaded", async () => {
    onRpc("/website/theme_customize_bundle_reload", () => ({}));
    const builder = await setupWebsiteBuilder("");
    await contains(".o_hb_snippets_tabs button[data-name=theme]").click();
    await contains(".o_hb_tab_content .o_hb_theme_color_slider_btn").click();
    await contains(".o_theme_tab button[title='Colors preview']").click();
    const iframeEl = await waitFor(".o_theme_colors_preview_dialog iframe");
    await animationFrame();
    const previewDocument = iframeEl.contentDocument;
    previewDocument.body.append(
        parseHTML(
            previewDocument,
            `<div style="background-color: #ffffff;"><p style="color: #eeeeee;">Faint</p></div>`
        )
    );
    expect(
        queryAll(".o_theme_colors_preview_contrast_warning", { root: previewDocument })
    ).toHaveLength(0);
    await builder.getEditor().shared.customizeWebsite.reloadBundles();
    expect(
        queryAll(".o_theme_colors_preview_contrast_warning", { root: previewDocument })
    ).toHaveLength(1);
});

// test("marks low-contrast text with a warning icon, once", () => {
//     allowTranslations();
//     const rootEl = getFixture();
//     rootEl.append(
//         parseHTML(
//             document,
//             `
//         <div style="background-color: #ffffff; color: #000000;">
//             <h4>Title</h4>
//             <a class="btn" style="background-color: #E2DBCF; color: #ffffff;">Primary</a>
//         </div>
//     `
//         )
//     );
//     markLowContrastElements(rootEl);
//     markLowContrastElements(rootEl);
//     expect(".o_theme_colors_preview_contrast_warning").toHaveCount(1);
//     expect("a.btn .o_theme_colors_preview_contrast_warning").toHaveAttribute(
//         "data-icon",
//         "warning"
//     );
//     expect("a.btn .o_theme_colors_preview_contrast_warning").toHaveAttribute(
//         "title",
//         /low contrast/
//     );
// });
