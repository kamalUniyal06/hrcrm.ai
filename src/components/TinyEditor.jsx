import { useQueryClient } from "@tanstack/react-query";
import { Editor } from "@tinymce/tinymce-react";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import { queryClient } from "../lib/queryClient"
import { setupEmailBackgroundHandling } from "../lib/tinyEmailBackground";
import { useIsDesktop } from "../hooks/useMediaQuery"

const TinyEditor = ({
  editorContent,
  setEditorContent,
  editorRef,
  setEditorReady
}) => {
  const TINY_EDITOR_API_KEY = queryClient.getQueryData(['tiny-key'])

  /* The menubar and status bar cost ~60px of vertical space and duplicate what
     the sliding toolbar already offers, which is a poor trade on a phone where
     the compose area is the scarce resource. The `key` forces a re-init when
     the breakpoint is crossed, since TinyMCE reads `init` only on mount —
     content survives because it lives in the parent's state. */
  const isDesktop = useIsDesktop();

  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="h-full w-full"
      >
        <Editor
          key={isDesktop ? "wide" : "narrow"}
          // apiKey={TINY_EDITOR_API_KEY}
          value={editorContent}
          onEditorChange={setEditorContent}
          onInit={(e, editor) => {
            if (editorRef) editorRef.current = editor;
            setEditorReady?.(true);
          }}
          init={{
            license_key: 'gpl',
            height: "100%",
            branding: false,
            statusbar: isDesktop,

            /* ================= PLUGINS ================= */
            plugins: `
          advlist autolink directionality
          visualblocks visualchars wordcount
          fullscreen preview searchreplace
          insertdatetime lists link image media
          table charmap pagebreak nonbreaking
          anchor code codesample  
           quickbars
        `,

            /* ================= TOOLBAR ================= */
            toolbar: `
          undo redo | blocks fontfamily fontsize |
          bold italic underline strikethrough forecolor backcolor |
          alignleft aligncenter alignright alignjustify |
          bullist numlist outdent indent |
          link image media table |
           charmap insertdatetime |
          preview fullscreen |
          code  
        `,

            toolbar_mode: "sliding",

            /* ================= MENUBAR ================= */
            menubar: isDesktop ? "file edit view insert format tools table " : false,

            /* ================= QUICKBARS ================= */
            quickbars_selection_toolbar:
              "bold  italic underline | quicklink h2 h3 blockquote",
            quickbars_insert_toolbar: "image media table ",



            /* ================= IMAGES ================= */
            image_advtab: true,
            image_caption: true,
            image_title: true,
            automatic_uploads: true,

            /* ================= TABLE ================= */
            table_advtab: true,
            table_cell_advtab: true,
            table_row_advtab: true,
            table_resize_bars: true,

            /* ================= LINKS ================= */
            link_assume_external_targets: true,
            link_context_toolbar: true,

            /* ================= CODE ================= */
            codesample_languages: [
              { text: "HTML/XML", value: "markup" },
              { text: "JavaScript", value: "javascript" },
              { text: "CSS", value: "css" },
              { text: "Java", value: "java" },
              { text: "Python", value: "python" },
              { text: "PHP", value: "php" },
            ],

            /* ================= ACCESSIBILITY ================= */
            a11y_advanced_options: true,
            setup: setupEmailBackgroundHandling,
            extended_valid_elements: `
  *[style|class|id|title|data-email-background-url],
  div[style|class|id|title],
  p[style|class|id|title],
  span[style|class|id|title],
  table[style|class|id|role|border|width|height|cellpadding|cellspacing|background|data-email-background-url],
  tbody[style|class|id],
  thead[style|class|id],
  tr[style|class|id|height],
  td[style|class|id|align|valign|width|height|colspan|rowspan|bgcolor|background|data-email-background-url],
  th[style|class|id|align|valign|width|height|colspan|rowspan|bgcolor|background|data-email-background-url],
  img[src|alt|title|width|height|style|class|border],
  a[href|target|rel|title|style|class]
`,

            valid_styles: {
              "*": [
                "background",
                "background-color",
                "background-image",
                "background-repeat",
                "background-size",
                "background-position",
                "color",
                "border",
                "border-color",
                "border-style",
                "border-width",
                "border-radius",
                "padding",
                "margin",
                "width",
                "max-width",
                "height",
                "text-align",
                "font-size",
                "font-family",
                "font-weight",
                "line-height",
                "display"
              ].join(","),
            },

            /* ================= CONTENT STYLE ================= */
            content_style: `
          body {
            font-family: -apple-system, BlinkMacSystemFont,
              'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #333;
          }
    
          img {
            max-width: 100%;
            height: auto;
          }
    
          table {
            border-collapse: collapse;
            width: 100%;
          }
    
          table, th, td {
            border: 1px solid #ccc;
          }
    
          th, td {
            padding: 8px;
          }
        `,

            /* ================= PREVIEW ================= */
            preview_styles:
              "font-family font-size font-weight font-style text-decoration color background-color border padding margin line-height",

            /* ================= UX ================= */
            contextmenu: "link image table",
            resize: isDesktop,
          }}
        />
      </motion.div>
    </div>
  );
};

export default TinyEditor;



export const SmallTinyEditor = ({
  editorContent,
  setEditorContent,
  editorRef,
  setEditorReady,
}) => {
  const TINY_EDITOR_API_KEY = queryClient.getQueryData(['tiny-key'])
  return (
    /* h-full all the way down so the editor fills whatever box it is given.
       It used to be hard-coded to 100vh inside an overflow-hidden wrapper,
       which meant the bottom of the editor (and its scrollbar) was clipped
       out of reach in any container shorter than the viewport. */
    <div className="h-full min-h-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full"
      >
        <Editor
          // apiKey={TINY_EDITOR_API_KEY}
          value={editorContent}
          onEditorChange={setEditorContent}
          onInit={(e, editor) => {
            editorRef.current = editor;
            setEditorReady(true);
          }}
          init={{
            license_key: 'gpl',
            height: "100%",
            menubar: false,
            branding: false,
            statusbar: false,

            // ✅ Add emoticons plugin
            plugins: `link lists `,

            // ✅ Add emoji button in toolbar
            toolbar: `
              bold italic underline link | 
   
    bullist numlist |
    
    undo redo
  `,

            resize: false,

            content_style: `
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont,
        'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #18181cff;

      padding: 10px;
      padding-bottom: 80px;

      overflow-y: auto;
    }
  `,
          }}
        />
      </motion.div>
    </div>
  );
};
