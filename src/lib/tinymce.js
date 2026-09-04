import tinymce from "tinymce/tinymce";

// Required
import "tinymce/models/dom";

// Theme & Icons
import "tinymce/themes/silver";
import "tinymce/icons/default";

// Skins (IMPORTANT)
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/skins/content/default/content.css";

// Plugins
import "tinymce/plugins/advlist";
import "tinymce/plugins/autolink";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/media";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/lists";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/preview";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/charmap";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/codesample";
import "tinymce/plugins/help";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/anchor";
import "tinymce/plugins/pagebreak";
import "tinymce/plugins/nonbreaking";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/visualchars";
import "tinymce/plugins/directionality";

// Temporarily remove these until editor works
import "tinymce/plugins/emoticons";
import "tinymce/plugins/quickbars";

export default tinymce;