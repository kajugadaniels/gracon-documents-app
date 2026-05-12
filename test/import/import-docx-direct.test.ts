import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DOMParser } from '@xmldom/xmldom';

import { importDocxXmlToTiptap } from '../../src/lib/import-docx-direct.ts';

describe('direct DOCX XML importer', () => {
    it('converts Word XML into editable TipTap content with rich formatting', () => {
        const originalDomParser = globalThis.DOMParser;

        try {
            globalThis.DOMParser = DOMParser as unknown as typeof globalThis.DOMParser;

            const documentXml = `
                <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                    <w:body>
                        <w:p>
                            <w:pPr>
                                <w:pStyle w:val="Heading1"/>
                                <w:spacing w:after="240"/>
                            </w:pPr>
                            <w:r>
                                <w:rPr>
                                    <w:b/>
                                    <w:u w:val="single"/>
                                    <w:color w:val="5B23FF"/>
                                    <w:sz w:val="32"/>
                                    <w:highlight w:val="yellow"/>
                                </w:rPr>
                                <w:t>Agreement</w:t>
                            </w:r>
                        </w:p>
                        <w:p>
                            <w:hyperlink r:id="rId1">
                                <w:r><w:t>Open Gracon</w:t></w:r>
                            </w:hyperlink>
                        </w:p>
                        <w:p>
                            <w:pPr>
                                <w:numPr><w:ilvl w:val="0"/><w:numId w:val="10"/></w:numPr>
                            </w:pPr>
                            <w:r><w:t>First obligation</w:t></w:r>
                        </w:p>
                        <w:tbl>
                            <w:tr>
                                <w:tc>
                                    <w:tcPr>
                                        <w:tcBorders><w:top w:val="single" w:sz="8" w:color="111111"/></w:tcBorders>
                                        <w:shd w:fill="EEEEEE"/>
                                    </w:tcPr>
                                    <w:p><w:r><w:t>Cell value</w:t></w:r></w:p>
                                </w:tc>
                            </w:tr>
                        </w:tbl>
                    </w:body>
                </w:document>
            `;
            const stylesXml = `
                <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:style w:type="paragraph" w:styleId="Heading1">
                        <w:name w:val="Heading 1"/>
                    </w:style>
                </w:styles>
            `;
            const numberingXml = `
                <w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
                    <w:abstractNum w:abstractNumId="1">
                        <w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1."/></w:lvl>
                    </w:abstractNum>
                    <w:num w:numId="10"><w:abstractNumId w:val="1"/></w:num>
                </w:numbering>
            `;
            const relationshipsXml = `
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://gracon.app"/>
                </Relationships>
            `;

            const doc = importDocxXmlToTiptap({
                documentXml,
                numberingXml,
                relationshipsXml,
                stylesXml,
            });

            assert.equal(doc?.type, 'doc');
            assert.equal(doc?.content?.[0].type, 'heading');
            assert.equal(doc?.content?.[0].attrs?.level, 1);
            assert.equal(doc?.content?.[0].attrs?.importedDocxStyle, 'margin-bottom: 16px');
            assert.equal(doc?.content?.[0].content?.[0].text, 'Agreement');
            assert.deepEqual(doc?.content?.[0].content?.[0].marks, [
                { type: 'bold' },
                { type: 'underline' },
                {
                    type: 'textStyle',
                    attrs: {
                        color: '#5B23FF',
                        fontSize: '16pt',
                        backgroundColor: '#FFFF00',
                    },
                },
            ]);
            assert.equal(doc?.content?.[1].content?.[0].marks?.[0].type, 'link');
            assert.equal(doc?.content?.[1].content?.[0].marks?.[0].attrs?.href, 'https://gracon.app/');
            assert.equal(doc?.content?.[2].type, 'orderedList');
            assert.equal(doc?.content?.[2].attrs?.listStyleType, 'lower-alpha');
            assert.equal(doc?.content?.[3].type, 'table');
            assert.match(
                String(doc?.content?.[3].content?.[0].content?.[0].attrs?.importedDocxStyle),
                /background-color: #EEEEEE/,
            );
        } finally {
            globalThis.DOMParser = originalDomParser;
        }
    });
});
