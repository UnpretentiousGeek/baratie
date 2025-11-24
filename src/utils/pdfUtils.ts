import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Recipe } from '../types';
import { decodeHtmlEntities } from './recipeUtils';

// Helper to sanitize text for PDF (handle fractions and special chars)
function sanitizeTextForPdf(text: string): string {
    if (!text) return '';
    let decoded = decodeHtmlEntities(text);

    // Replace non-breaking spaces with regular spaces
    decoded = decoded.replace(/\u00A0/g, ' ');

    // Replace fraction characters with text equivalents
    const replacements: Record<string, string> = {
        '⅛': '1/8',
        '⅜': '3/8',
        '⅝': '5/8',
        '⅞': '7/8',
        '⅓': '1/3',
        '⅔': '2/3',
        '⅙': '1/6',
        '⅚': '5/6',
        '⅕': '1/5',
        '⅖': '2/5',
        '⅗': '3/5',
        '⅘': '4/5',
        '¼': '1/4',
        '½': '1/2',
        '¾': '3/4',
    };

    return decoded.replace(/[⅛⅜⅝⅞⅓⅔⅙⅚⅕⅖⅗⅘¼½¾]/g, char => replacements[char] || char);
}

export const generateRecipePDF = (recipe: Recipe) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Helper to check for page break
    const checkPageBreak = (heightNeeded: number) => {
        if (yPos + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = margin;
        }
    };

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(sanitizeTextForPdf(recipe.title), pageWidth - 2 * margin);
    doc.text(titleLines, margin, yPos);
    yPos += (titleLines.length * 10) + 5;

    // Macros
    if (recipe.nutrition) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const macrosText = `Calories: ${recipe.nutrition.calories || 0} | Protein: ${recipe.nutrition.protein || 0}g | Carbs: ${recipe.nutrition.carbs || 0}g | Fat: ${recipe.nutrition.fat || 0}g`;
        doc.text(sanitizeTextForPdf(macrosText), margin, yPos);
        yPos += 10;
    }

    // Ingredients
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingredients', margin, yPos);
    yPos += 8;

    const ingredientRows: string[][] = [];

    if (recipe.ingredients) {
        recipe.ingredients.forEach(ing => {
            if (typeof ing === 'string') {
                ingredientRows.push([sanitizeTextForPdf(ing)]);
            } else {
                // Handle RecipeSection
                if (ing.title) {
                    ingredientRows.push([sanitizeTextForPdf(ing.title)]);
                }
                if (ing.items) {
                    ing.items.forEach(item => {
                        ingredientRows.push([sanitizeTextForPdf(item)]);
                    });
                }
            }
        });
    }

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: ingredientRows as any,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 'auto' } },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
            // Bold section headers (simple heuristic: if it matches a section title)
            const text = data.cell.raw as string;
            // Check if this text was a section title in the original data
            const isSectionTitle = recipe.ingredients.some(i => typeof i !== 'string' && sanitizeTextForPdf(i.title || '') === text);
            if (isSectionTitle) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // Update yPos after table
    yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;

    // Instructions
    yPos += 10; // Add extra space before instructions header
    checkPageBreak(30); // Ensure enough space for header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions', margin, yPos);
    yPos += 10;

    const instructionRows: string[][] = [];
    let stepCount = 1;

    if (recipe.instructions) {
        recipe.instructions.forEach(inst => {
            if (typeof inst === 'string') {
                instructionRows.push([String(stepCount++), sanitizeTextForPdf(inst)]);
            } else {
                // Handle RecipeSection for instructions
                if (inst.title) {
                    // Add section title as a row without number, maybe bold it
                    instructionRows.push(['', sanitizeTextForPdf(inst.title)]);
                }
                if (inst.items) {
                    inst.items.forEach(item => {
                        instructionRows.push([String(stepCount++), sanitizeTextForPdf(item)]);
                    });
                }
            }
        });
    }

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: instructionRows as any,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 15, fontStyle: 'bold', valign: 'top' }, // Increased width for step numbers
            1: { cellWidth: 'auto', valign: 'top' }
        },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
            // Bold section headers in instructions (where first col is empty)
            if (data.column.index === 1 && data.row.raw && (data.row.raw as string[])[0] === '') {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // Open in new tab
    window.open(doc.output('bloburl'), '_blank');
};
