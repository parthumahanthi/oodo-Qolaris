import { Interaction } from '@web/public/interaction';
import { registry } from '@web/core/registry';
import {
    ProductComparisonBottomBar
<<<<<<< 859c06f83a80b0b39e2ced68b3547961312d66bf:addons/website_sale/static/src/interactions/comparison_bottom_bar.js
} from '@website_sale/js/product_comparison_bottom_bar/product_comparison_bottom_bar';
||||||| 1a13d257eb4850ff1e92104bceb4d186a82622f5:addons/website_sale_comparison/static/src/interactions/comparison_bottom_bar.js
} from '@website_sale_comparison/js/product_comparison_bottom_bar/product_comparison_bottom_bar';
=======
} from '@website_sale_comparison/js/product_comparison_bottom_bar/product_comparison_bottom_bar';
import comparisonUtils from '@website_sale_comparison/js/website_sale_comparison_utils';
>>>>>>> a4f09aed7173a7d402c6af7f23765717c0443d69:addons/website_sale_comparison/static/src/interactions/comparison_bottom_bar.js

export class ComparisonBottomBar extends Interaction {
    static selector = '.o_wsale_product_page, .o_wsale_products_page, .o_wsale_wishlist_page';
    dynamicContent = {
        _window: { 't-on-pageshow': this.onPageShow },
    };

    setup() {
        // Mount the ProductComparisonBottomBar on pages with comparison functionality.
        this.mountComponent(this.el, ProductComparisonBottomBar);
    }

    /**
     * Refresh comparison state changed on another page while this page was cached.
     *
     * @param {PageTransitionEvent} ev
     */
    onPageShow(ev) {
        if (!ev.persisted) return;
        const productIds = comparisonUtils.getComparisonProductIds();
        const buttons = this.el.querySelectorAll(
            '.o_add_compare, .o_add_compare_dyn, .o_add_to_compare'
        );
        for (const button of buttons) {
            const productId = parseInt(button.dataset.productId);
            button.disabled = productIds.includes(productId);
        }
        comparisonUtils.notifyComparisonListeners(this.env.bus);
    }
}

registry
    .category('public.interactions')
    .add('website_sale.comparison_bottom_bar', ComparisonBottomBar);
